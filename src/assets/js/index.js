// Note: most modules are conditionally loaded in the footer.
// Use this entry point for modules that need to load on every page.

// Must import DialogGallery here or masonry layout will fail.
import DialogGallery from "./DialogGallery.js";
import ThemeSwitcher from "./themeSwitcher.js";

DialogGallery;
ThemeSwitcher;
