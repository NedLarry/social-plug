# Whot card media

Put card photos or scans in this folder. `npm run dev` and `npm run build` turn them
into small, cropped copies in `web/`, which is what the app actually loads. You can
also run `npm run cards` yourself. Only new or changed photos are processed.

Naming (any case, .jpg / .jpeg / .png / .webp):

- Face cards: `<shape>-<number>`, e.g. `circle-1.JPG`, `angle-7.jpg`, `whot-20.jpg`
  - shapes: `circle` (or `ball`), `triangle` (or `angle`), `cross`, `square` (or `carpet`), `star`, `whot`
- Card back: `back.jpg` (none yet, so the app draws a plain back)

Cropping assumes each card is photographed on a plain, yellowish/beige surface, like the
current set. Any card without an image falls back to the numbered placeholder.
