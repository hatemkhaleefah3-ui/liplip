# liplip

A responsive, static concept for a language learning site made for people in Iraq. Open `index.html` in a browser, or serve this directory with any static host.

## Flow

Landing → Join → sign-up/sign-in preview → profile → optional five-question English check → personalized home. Study, Closet, Chat / Speak, and Settings show coming-soon pages. The navigation is under the header on desktop, a sidebar on tablets, and a fixed bottom bar on phones. The interface copy is currently in English.

## Authentication and privacy

This is a **front-end preview**, not production authentication. The email step grants local preview access without verifying an account. Google, Facebook, and WhatsApp buttons explicitly explain that they require configuration; they do not sign users in. Profile details live in `sessionStorage` in the current browser tab and are cleared when the tab is closed or the user logs out. Do not use this preview to collect real user data.

To launch with real accounts, integrate an auth provider and server-side profile storage, configure Google/Facebook OAuth client IDs and allowed redirect URLs, and choose a supported WhatsApp verification flow (for example, a business messaging OTP service with server-side verification). WhatsApp is not a generic OAuth identity provider. Add consent, data retention, deletion, and access controls before collecting birth dates, gender, and location. Replace the quick check with a validated assessment before claiming formal CEFR proficiency.

## Structure

- `index.html` — document shell and font loading
- `styles.css` — design system and responsive layouts
- `app.js` — preview flow, form validation, and local state
