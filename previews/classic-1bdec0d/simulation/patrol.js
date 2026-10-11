// Fixed backing-map bits keep 200 full-map patrols within the save-size limit.
export function encodePatrol(tiles) {
    if (!tiles.length)
        return [];
    const words = Array(2048).fill(0);
    for (const tile of tiles) {
        const bit = tile.y * 256 + tile.x, index = bit >>> 5;
        words[index] = (words[index] | (1 << (bit & 31))) >>> 0;
    }
    return words;
}
export function inPatrol(words, tile) {
    if (!words.length)
        return true;
    const bit = tile.y * 256 + tile.x;
    return !!(words[bit >>> 5] & (1 << (bit & 31)));
}
