export function generateId() {
    return 'id-' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

export function generateSessionCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

export function slugify(text) {
    return String(text).toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || 'tag';
}
