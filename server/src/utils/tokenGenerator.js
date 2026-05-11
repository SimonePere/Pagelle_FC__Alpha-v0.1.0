const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I/l
function generateInviteToken() {
    return Array.from({ length: 8 }, () =>
        CHARS[Math.floor(Math.random() * CHARS.length)]
    ).join('');
}

module.exports = { generateInviteToken };