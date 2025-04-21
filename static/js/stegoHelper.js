/**
 * Helper untuk steganografi DCT dengan optimasi kualitas gambar
 */

// Fungsi untuk kompresi pesan sebelum embedding
function compressMessage(message) {
    // Implementasi kompresi sederhana dengan RLE (Run-Length Encoding)
    let result = '';
    let count = 1;
    for (let i = 0; i < message.length; i++) {
        if (message[i] === message[i+1]) {
            count++;
        } else {
            if (count > 3) {
                result += '#' + count + '#' + message[i]; // Format khusus untuk run
            } else {
                result += message.substr(i-count+1, count);
            }
            count = 1;
        }
    }
    return result;
}

// Fungsi untuk dekompresi pesan setelah ekstraksi
function decompressMessage(message) {
    // Dekompresi RLE
    let result = '';
    for (let i = 0; i < message.length; i++) {
        if (message[i] === '#') {
            let count = '';
            i++;
            while (message[i] !== '#' && i < message.length) {
                count += message[i];
                i++;
            }
            i++;
            if (i < message.length) {
                result += message[i].repeat(parseInt(count));
            }
        } else {
            result += message[i];
        }
    }
    return result;
}

// Fungsi untuk memprediksi kualitas berdasarkan ukuran pesan dan gambar
function predictQuality(imageSize, messageLength) {
    // Hitung rasio pesan terhadap ukuran gambar (dalam persen)
    const ratio = (messageLength * 8) / (imageSize * 0.01);
    
    // Tentukan level kualitas berdasarkan rasio
    if (ratio < 0.01) return 1;      // Level tertinggi untuk pesan sangat kecil
    else if (ratio < 0.05) return 2; // Level tinggi untuk pesan kecil
    else if (ratio < 0.1) return 3;  // Level default untuk pesan normal
    else if (ratio < 0.2) return 4;  // Level rendah untuk pesan besar
    else return 5;                   // Level terendah untuk pesan sangat besar
}

// Fungsi pembungkus untuk embedding dengan optimasi kualitas otomatis
function writeOptimizedMsg(canvasId, message, password, userQuality = 0) {
    // Kompres pesan terlebih dahulu
    const compressedMsg = compressMessage(message);
    
    // Dapatkan canvas dan ukuran gambar
    const canvas = document.getElementById(canvasId);
    const imageSize = canvas.width * canvas.height;
    
    // Jika pengguna tidak menentukan kualitas, hitung otomatis
    let quality = userQuality;
    if (quality === 0) {
        quality = predictQuality(imageSize, compressedMsg.length);
    }
    
    // Panggil fungsi asli dengan parameter yang optimal
    return writeMsgToCanvas(canvasId, compressedMsg, password, quality);
}

// Fungsi pembungkus untuk ekstraksi dengan dekompresi
function readOptimizedMsg(canvasId, password, quality = 0) {
    // Ekstrak pesan menggunakan fungsi asli
    const compressedMsg = readMsgFromCanvas(canvasId, password, quality);
    
    // Jika ekstraksi gagal, kembalikan null
    if (compressedMsg === null) {
        return null;
    }
    
    // Coba dekompresi pesan jika berhasil diekstrak
    try {
        return decompressMessage(compressedMsg);
    } catch (e) {
        // Jika dekompresi gagal, kembalikan pesan asli
        return compressedMsg;
    }
}