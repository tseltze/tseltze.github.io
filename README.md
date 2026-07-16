# Terina Seltzer Portfolio

A responsive personal portfolio site for Terina Seltzer, built with plain HTML, CSS, and JavaScript. The site presents professional background, technical skills, experience, certifications, education, contact links, and a contact form.

## Project Files

- `index.html` - Main page markup, SEO/Open Graph metadata, content sections, navigation, and contact form.
- `style.css` - Theme tokens, layout, responsive styles, accessibility helpers, animations, and user text-size styling.
- `main.js` - Theme switching, scroll progress, section highlighting, typewriter animation, canvas effects, email copy behavior, contact form handling, chess game, and text-size persistence.

## Main Features

- Dark/light theme toggle with saved preference.
- Text-size slider with saved preference and accessible range metadata.
- Responsive fixed header with primary navigation.
- Hero section with portrait, animated typewriter text, and call-to-action buttons.
- Skills, experience, certifications, education, and contact sections.
- Contact form powered by Formspree.
- Copy-to-clipboard email behavior with fallback to `mailto:`.
- Scroll progress indicator, active navigation state, dot navigation, and back-to-top button.
- Reduced-motion support for animation-heavy behavior.

## Accessibility Notes

- Includes a skip link for keyboard users.
- Uses semantic sections, labeled form fields, and accessible button labels.
- Animated typewriter text is hidden from assistive technology and paired with stable screen-reader text.
- The text-size slider updates `aria-valuenow` and `aria-valuetext`.
- Focus-visible styles are included for keyboard navigation.

![alt text](personal-website)
