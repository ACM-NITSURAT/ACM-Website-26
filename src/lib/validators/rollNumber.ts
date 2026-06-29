/**
 * SVNIT roll number validator.
 *
 * Fixed format: 1 letter + 2 digits + 2 letters + 3 digits
 * Examples: U24CS089, U22ME011, U21AI091
 * Total length: 8 characters.
 *
 * Side-effect free. Runs in both server and browser contexts.
 */

const ROLL_NUMBER_REGEX = /^[A-Za-z]\d{2}[A-Za-z]{2}\d{3}$/;

/**
 * Returns true if the string matches the SVNIT roll number format.
 */
export function isValidRollNumber(roll: string): boolean {
  return ROLL_NUMBER_REGEX.test(roll.trim());
}

export const ROLL_NUMBER_ERROR =
  'Roll number must follow the format: U24CS089 (1 letter, 2 digits, 2 letters, 3 digits).';
