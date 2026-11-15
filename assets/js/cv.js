// The CV remains fully readable and downloadable without JavaScript.
// Keep the portfolio's optional access-code navigation consistent on desktop.
import { bindCode, paintCode, access, ROOT } from './ui.js';
bindCode(document, {
  onChange: (selection, fresh) => {
    paintCode(selection);
    if (fresh) location.href = ROOT;
  },
});
paintCode(access.get());
