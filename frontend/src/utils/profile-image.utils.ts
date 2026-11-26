/**
 * Builds the URL of an avatar image.
 * @param {string} icon The avatar id (e.g. ICON1).
 * @return {string} The image URL.
 */
export const buildProfileImageRoute = (icon: string): string => {
    return `${import.meta.env.VITE_PROFILE_IMAGES_URL}${icon}.png`;
};