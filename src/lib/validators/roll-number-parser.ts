/**
 * SVNIT roll number / email parser.
 *
 * Extracts structured institutional data from an SVNIT email or roll number.
 *
 * Roll format:  u24cs024            (8 chars)
 * Email format: u24cs024@coed.svnit.ac.in
 *               u24ai091.aid@svnit.ac.in
 *
 * Structure:
 *   [program][admissionYear][branchCode][studentNumber]
 *   u        24             cs          024
 *
 * program:
 *   u = undergraduate (4-year B.Tech)
 *   i = integrated    (5-year M.Tech / MSc)
 *
 * This module is side-effect free and runs in both server and browser contexts.
 */

import { BRANCH_MAP, type BranchInfo } from '@/config/leaderboard';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ParsedRollNumber {
  /** Raw roll extracted from email (lowercase). */
  raw: string;
  /** 'undergrad' (4yr B.Tech) or 'integrated' (5yr). */
  programType: 'undergrad' | 'integrated';
  /** Full admission year, e.g. 2024. */
  admissionYear: number;
  /** Expected graduation year (admission + 4 or 5). */
  graduationYear: number;
  /**
   * Current academic year (1-based).
   * Clamped to [1, programDuration]. Uses the academic year starting July:
   * if the current month is ≥ July, the student is in the next year.
   */
  currentYear: number;
  /** Duration of the program in years (4 or 5). */
  programDuration: number;
  /** Lowercase 2-char branch code from the email (e.g. 'cs'). */
  emailBranchCode: string;
  /** Canonical uppercase branch code (e.g. 'CSE'). Null if not in BRANCH_MAP. */
  branchCode: string | null;
  /** Full branch display name. Null if not in BRANCH_MAP. */
  branchName: string | null;
  /** Student number within the branch (e.g. '024'). */
  studentNumber: string;
}

// ── Regex ─────────────────────────────────────────────────────────────────────

/**
 * Captures:
 *   1 = program letter (u | i)
 *   2 = 2-digit admission year
 *   3 = 2-letter branch code
 *   4 = remaining digits (student number)
 *
 * Intentionally loose on the suffix: some emails have `.aid`, `.eed`, etc.
 * after the student number. We capture only the core roll segment.
 */
const ROLL_REGEX = /^([ui])(\d{2})([a-z]{2})(\d{2,4})/i;

// ── Parser ────────────────────────────────────────────────────────────────────

/**
 * Parse a roll number or email into structured data.
 *
 * Accepts:
 *  - Roll number: "u24cs024"
 *  - Full email:  "u24cs024@coed.svnit.ac.in"
 *  - Email with suffix: "u24ai091.aid@svnit.ac.in"
 *
 * Returns null if the input doesn't match the expected format.
 *
 * @example
 * parseRollNumber('u24cs024@coed.svnit.ac.in')
 * // {
 * //   raw: 'u24cs024',
 * //   programType: 'undergrad',
 * //   admissionYear: 2024,
 * //   graduationYear: 2028,
 * //   currentYear: 2,
 * //   programDuration: 4,
 * //   emailBranchCode: 'cs',
 * //   branchCode: 'CSE',
 * //   branchName: 'Computer Science & Engineering',
 * //   studentNumber: '024',
 * // }
 */
export function parseRollNumber(input: string): ParsedRollNumber | null {
  // Strip email domain if present — take everything before '@'
  const rollPart = input.trim().toLowerCase().split('@')[0];
  // Also strip optional suffix after '.' (e.g. ".aid")
  const core = rollPart.split('.')[0];

  const match = ROLL_REGEX.exec(core);
  if (!match) return null;

  const [, programLetter, yearStr, branchCode, studentNum] = match;

  const programType = programLetter.toLowerCase() === 'u' ? 'undergrad' : 'integrated';
  const programDuration = programType === 'undergrad' ? 4 : 5;

  const admissionYearShort = parseInt(yearStr, 10);
  // Handle century: 00–99 → 2000–2099 (safe for the foreseeable future)
  const admissionYear = 2000 + admissionYearShort;
  const graduationYear = admissionYear + programDuration;

  // Compute current academic year.
  // Academic year starts in July: if we're past July, the student is one year ahead.
  const now = new Date();
  const calendarYear = now.getFullYear();
  const month = now.getMonth(); // 0-indexed: 0=Jan, 6=Jul
  const academicYear = month >= 6 ? calendarYear : calendarYear - 1;
  const rawYear = academicYear - admissionYear + 1;
  const currentYear = Math.max(1, Math.min(rawYear, programDuration));

  // Look up branch info
  const branchLower = branchCode.toLowerCase();
  const branchInfo: BranchInfo | undefined = BRANCH_MAP[branchLower];

  return {
    raw: core,
    programType,
    admissionYear,
    graduationYear,
    currentYear,
    programDuration,
    emailBranchCode: branchLower,
    branchCode: branchInfo?.code ?? null,
    branchName: branchInfo?.displayName ?? null,
    studentNumber: studentNum,
  };
}

/**
 * Generate a URL-friendly slug from a user's name and roll number.
 *
 * Format: "siddharth-sheth-u24cs024"
 *
 * @param firstName - User's first name
 * @param lastName  - User's last name
 * @param rollNumber - Roll number (e.g. "u24cs024")
 */
export function generateSlug(firstName: string, lastName: string, rollNumber: string): string {
  const namePart = `${firstName} ${lastName}`
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')   // strip non-alphanumeric
    .replace(/\s+/g, '-')            // spaces → hyphens
    .replace(/-+/g, '-')             // collapse multiple hyphens
    .replace(/^-|-$/g, '');          // trim leading/trailing hyphens

  const rollPart = rollNumber
    .toLowerCase()
    .trim()
    .split('.')[0];                   // strip suffix like ".aid"

  return `${namePart}-${rollPart}`;
}

/**
 * Extract the roll number segment from a slug.
 *
 * Given "siddharth-sheth-u24cs024", returns "u24cs024".
 * Returns null if no roll-like segment is found.
 */
export function extractRollFromSlug(slug: string): string | null {
  // The roll number is always the last segment matching the pattern
  const match = slug.match(/[ui]\d{2}[a-z]{2}\d{2,4}$/i);
  return match ? match[0].toLowerCase() : null;
}
