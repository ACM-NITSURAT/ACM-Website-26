const fs = require('fs');
const file = 'c:/Users/shset/OneDrive/Desktop/MyProjects/ACM-Website/ACM-Website-26/src/components/navigation/Navbar.module.css';
let css = fs.readFileSync(file, 'utf8');

// Define variables in .plate
css = css.replace('.plate {\n', '.plate {\n  --theme-main: 255, 200, 120;\n  --theme-light: 255, 220, 160;\n  --theme-glow: 255, 240, 200;\n');

// Replace colors
css = css.replace(/255,\s*200,\s*120/g, 'var(--theme-main)');
css = css.replace(/255,\s*210,\s*140/g, 'var(--theme-main)');
css = css.replace(/255,\s*220,\s*160/g, 'var(--theme-light)');
css = css.replace(/255,\s*240,\s*200/g, 'var(--theme-glow)');
css = css.replace(/255,\s*245,\s*225/g, 'var(--theme-glow)');
css = css.replace(/255,\s*235,\s*200/g, 'var(--theme-glow)');

// Add theme classes
const themes = `
/* ============================================================
   THEMES
   ============================================================ */
.plateThemeAbout {
  --theme-main: 37, 99, 235;
  --theme-light: 96, 165, 250;
  --theme-glow: 191, 219, 254;
}
.plateThemeEvents {
  --theme-main: 168, 85, 247;
  --theme-light: 192, 132, 252;
  --theme-glow: 233, 213, 255;
}
.plateThemeProjects {
  --theme-main: 16, 185, 129;
  --theme-light: 52, 211, 153;
  --theme-glow: 167, 243, 208;
}
.plateThemeTeam {
  --theme-main: 249, 115, 22;
  --theme-light: 251, 146, 60;
  --theme-glow: 254, 215, 170;
}
`;

// Remove the old plateThemeAbout block
css = css.replace(/\/\* About section — shifts to blue \*\/[\s\S]*?\/\* Plate dust in blue theme \*\/[\s\S]*?\}/g, '');
css = css.replace(/\.plateThemeAbout \{[\s\S]*?\}/g, ''); // just in case

css += themes;

fs.writeFileSync(file, css);
console.log('CSS updated');
