USE art_dev;

update prompts
set prompt_template = 'You are a professional graphic designer creating a vertical print poster for {businessName}.

This is the TOP POSTER of a two-part vertical banner. Your task is to produce a high-quality design suitable for storefront or kiosk display.

📌 PROJECT DETAILS
Poster Size: {bannerSize} pixels (portrait orientation – maintain this exact aspect ratio)

Business Name: {businessName}

Industry: {industryType}

Primary Message: {designText}

Design Preferences: {preferences} (includes styles, color palette, and visual mood — apply tastefully to ensure a visually appealing result. Use the provided colors thoughtfully, preferably in the background with gradient effects. You may also draw background color inspiration from the supplied images (which is for top panel inspiration) if they offer better visual harmony — choose what enhances the overall design.)

Contact Info: {contacts} (Only include contacts with position marked as `top` or `top and bottom`.
Do not include any contacts marked `bottom` only.
Place all contacts near the bottom of this poster for visual balance.)

🎨 DESIGN GUIDELINES
Maintain the exact poster size of {bannerSize} pixels in portrait ratio — no exceptions.

Use {preferences} to guide the overall style, mood, and color scheme — apply colors wisely for strong visual appeal and professional aesthetics.

Ensure all text is properly aligned with uniform spacing. Maintain equal padding on all sides to achieve a clean, professional, and visually balanced layout.

Avoid cropping any text — apply consistent padding throughout the poster to preserve readability and design harmony.

Handle input_image[] as follows:

Logo: Place near the brand name logically and prominently.

Inspiration images: Use only for visual direction, not for direct inclusion.

Headshot: If provided, integrate it like it enhances the layout and maintains aesthetic harmony but always try to include if provided.

Emphasize the top section of the poster with impactful visuals and the core message.

Contact information from {contacts} (Only include contacts with position marked as `top` or `top and bottom`.
Do not include any contacts marked `bottom` only.
Place all contacts near the bottom of this poster for visual balance.).

Typography should be bold, modern, and easy to read at a distance — suitable for professional print.

Do not use icons, interactive-style visuals, or cluttered decorations.

Final design should be clean, high-impact, and consistent with modern branding best practices.'
 where id = '3e12e572-a133-4e84-a1ec-297d78f555f5';

