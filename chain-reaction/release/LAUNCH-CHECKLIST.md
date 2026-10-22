# Launch checklist

Tick these off before telling the world. Each takes a minute or two.

## Before uploading
- [ ] `js/config.js`: `siteUrl`, `contactEmail` and the Join the Flock `provider` are filled in.
- [ ] If you use Kit: `kitFormId` is set and the form has double opt-in switched on.
- [ ] `index.html`: the two `img/og.jpg` lines use your full address.
- [ ] Run `python3 tools/build.py` (this refreshes `sw.js`).

## After uploading
- [ ] Open the site on an Android phone in Chrome: First Steps starts after tapping Play.
- [ ] Open it on an iPhone in Safari: tap Share, then Add to Home Screen; the lamb icon appears.
- [ ] On Android, tap Install on Home; the game opens full screen from the home screen.
- [ ] Turn on aeroplane mode and open the game again: it still works.
- [ ] Send yourself a Join the Flock sign-up and check it arrives (Netlify: Forms; Kit: Subscribers).
- [ ] Share a result to a messaging app: the picture and address look right.
- [ ] Paste your address into a chat: the preview shows the pasture picture.
- [ ] Visit `/privacy.html` and a made-up page like `/nothing-here` (the friendly 404).
- [ ] Back up from Settings → Backup code on one device and restore on another.

## Releasing an update later
- [ ] Raise `version` in `js/config.js` and add a line to What's New in `js/strings.js`.
- [ ] Run `python3 tools/build.py` and upload the folder again.
- [ ] Open the game: "Update ready, tap to refresh" appears on Home.
