// Base "pixel art" design tokens (fonts, colors, btn/card/input/badge
// classes) shared between the public app (App.jsx) and the admin shell
// (AdminApp.jsx) so both entry points look like one product, not two.
// Page-specific classes (e.g. App.jsx's syllable-slot/rhyme-underline)
// stay local to their own file rather than living here.
const SharedStyles = () => (
  <style dangerouslySetInnerHTML={{__html: `
    @import url('https://fonts.googleapis.com/css2?family=Kanit:wght@600;700&family=Sarabun:wght@400;500&display=swap');

    :root {
      --c-cream: #F5F0E8;
      --c-parchment: #FAF4E8;
      --c-sage: #7A9E7E;
      --c-sage-light: #A8C5A0;
      --c-sage-dark: #5A7A5E;
      --c-sky-light: #D0E8F2;
      --c-charcoal: #2C2C2C;
      --c-brick: #C0392B;
      --c-gold: #D4AF37;
    }

    .font-heading { font-family: 'Kanit', sans-serif; }
    .font-body { font-family: 'Sarabun', sans-serif; }

    /* Component Patterns */
    .btn-pixel {
      font-family: 'Sarabun', sans-serif;
      font-weight: 500;
      border: 3px solid var(--c-charcoal);
      box-shadow: 4px 4px 0px var(--c-charcoal);
      transition: all 0.1s ease-in-out;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
    }
    .btn-pixel:hover:not(:disabled) {
      transform: translateY(-2px);
    }
    .btn-pixel:active:not(:disabled) {
      transform: translate(4px, 4px) !important;
      box-shadow: none !important;
    }
    .btn-pixel:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .btn-primary { background-color: var(--c-sage); color: white; }
    .btn-secondary { background-color: var(--c-cream); color: var(--c-charcoal); }
    .btn-danger { background-color: var(--c-brick); color: white; }

    .card-pixel {
      background-color: var(--c-parchment);
      border: 3px solid var(--c-charcoal);
      box-shadow: 4px 4px 0px var(--c-charcoal);
      border-radius: 0;
    }

    .input-pixel {
      background-color: var(--c-parchment);
      border: 2px solid var(--c-charcoal);
      outline: none;
      transition: border-color 0.2s;
      font-family: 'Sarabun', sans-serif;
      color: var(--c-charcoal);
    }
    .input-pixel:focus {
      border-color: var(--c-sage);
    }

    .badge-pixel {
      border: 2px solid var(--c-charcoal);
      box-shadow: 2px 2px 0px var(--c-charcoal);
    }
  `}} />
);

export default SharedStyles;
