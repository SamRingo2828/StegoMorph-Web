$(document).ready(function() {
    // ====================== ENCODE HANDLER ======================
    // Preview gambar untuk encode
    $('#file').change(function(e) {
        const reader = new FileReader();
        reader.onload = function(event) {
            $('#uploadPreview').attr('src', event.target.result);
        }
        reader.readAsDataURL(e.target.files[0]);
    });

    // Handler tombol encode
    $('#encodeBtn').click(writeIMG);

    // Handler clear input encode
    $('#clearBtn').click(function() {
        $('#file').val('');
        $('#pass').val('');
        $('#msg').val('');
        $('#uploadPreview, #resultPreview').attr('src', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=');
        $('#downloadBtn').addClass('d-none');
        $('#encodeError').addClass('d-none');
    });

    // ====================== DECODE HANDLER ======================
    // Preview gambar untuk decode
    $('#file1').change(function(e) {
        const reader = new FileReader();
        reader.onload = function(event) {
            $('#uploadPreview').attr('src', event.target.result);
        }
        reader.readAsDataURL(e.target.files[0]);
    });

    // Handler tombol decode
    $('#decodeBtn').click(decodeIMG);

   // Handler clear input decode
    $('#clearBtnDecode').click(function() {
        // Clear input file dan password
        $('#file1').val('');
        $('#pass1').val('');
        
        // Reset preview gambar
        $('#uploadPreview').attr('src', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=')
                        .css('opacity', '1');
        
        // Reset hasil ekstraksi
        $('#result').html('<span class="text-muted">Hasil ekstraksi akan muncul disini...</span>')
                .removeClass('alert-danger alert-success');
        
        // Reset status tombol
        $('#decodeBtn').prop('disabled', false)
                    .find('.spinner-border').addClass('d-none');
    });
});

// ====================== ENCODE FUNCTIONS ======================
function writeIMG() {
    const $btn = $('#encodeBtn');
    const $file = $('#file');
    const $msg = $('#msg');
    const $error = $('#encodeError');

    // Reset state
    resetEncodeState();
    
    // Validasi input
    if (!$file[0].files[0]) return showEncodeError('Harap pilih gambar terlebih dahulu!');
    if (!$msg.val()) return showEncodeError('Harap masukkan pesan rahasia!');

    // Proses encoding
    const writefunc = () => {
        try {
            if(writeMsgToCanvas('canvas', $msg.val(), $('#pass').val(), 3)) {
                const canvas = document.getElementById('canvas');
                const image = canvas.toDataURL('image/jpeg', 1.0);
                
                // Update preview dan tombol download
                $('#resultPreview').attr('src', image);
                $('#downloadBtn').removeClass('d-none').off('click').click(() => downloadImage(image));
            }
        } catch (error) {
            showEncodeError('Gagal menyembunyikan pesan!');
            console.error(error);
        } finally {
            $btn.prop('disabled', false);
            $btn.find('.spinner-border').addClass('d-none');
        }
    };

    startProcessing($btn);
    loadIMGtoCanvas('file', 'canvas', writefunc, 512);
}

// ====================== DECODE FUNCTIONS ======================
function decodeIMG() {
    const $btn = $('#decodeBtn');
    const $file = $('#file1');
    const $result = $('#result');

    // Validasi input
    if (!$file[0].files[0]) return showDecodeError('Harap pilih gambar terlebih dahulu!');

    const readfunc = () => {
        try {
            const result = readMsgFromCanvas('canvas', $('#pass1').val(), 3);
            const canvas = document.getElementById('canvas');
            
            // Format hasil
            const formattedResult = formatDecodedResult(result);
            
            // Tampilkan hasil
            result ? showDecodedResult(formattedResult) : showDecodeError('Pesan tidak ditemukan!');
        } catch (error) {
            showDecodeError('Terjadi kesalahan saat memproses!');
            console.error(error);
        } finally {
            $btn.prop('disabled', false);
            $btn.find('.spinner-border').addClass('d-none');
        }
    };

    startProcessing($btn);
    loadIMGtoCanvas('file1', 'canvas', readfunc, 512);
}

// ====================== UTILITY FUNCTIONS ======================
function startProcessing($btn) {
    $btn.prop('disabled', true);
    $btn.find('.spinner-border').removeClass('d-none');
}

function resetEncodeState() {
    $('#encodeError').addClass('d-none').css('animation', '');
    $('#encodeBtn').prop('disabled', false);
}

function formatDecodedResult(result) {
    return result
        .trim()
        .replace(/\s+/g, ' ')
        .replace(/(\r\n|\n|\r)/gm, '\n')
        .split('\n')
        .map(line => line.trim())
        .filter(line => line !== '')
        .join('<br>');
}

function downloadImage(image) {
    const link = document.createElement('a');
    link.href = image;
    link.download = 'encoded_image.jpg';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function showEncodeError(message) {
    $('#encodeError')
        .html(`❌ ${message}`)
        .removeClass('d-none')
        .css('animation', 'shake 0.5s linear');
}

function showDecodeError(message) {
    $('#result')
        .html(`<div class="text-danger">❌ ${message}</div>`)
        .addClass('alert-danger');
}

function showDecodedResult(result) {
    $('#result').html(`
        <div class="text-success mb-2">✅ Pesan berhasil diekstrak!</div>
        <div class="decoded-message bg-dark-2 p-3 rounded-2">${result}</div>
    `).removeClass('alert-danger');
}

// ====================== PSNR HANDLER ======================
let originalImageData = null;
let stegoImageData = null;

// Handle image upload preview
function handleImageUpload(input, previewId, callback) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        // Update preview
        $(previewId).attr('src', e.target.result);
        
        // Process image data
        processImageData(e.target.result).then(data => {
            callback(data);
        });
    };
    reader.readAsDataURL(file);
}

// Process image with EXIF orientation
async function processImageData(imageSrc) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = function() {
            EXIF.getData(img, function() {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                // Handle orientation
                let width = img.naturalWidth;
                let height = img.naturalHeight;
                const orientation = EXIF.getTag(this, 'Orientation');

                if (orientation >= 5) {
                    [width, height] = [height, width];
                }

                canvas.width = width;
                canvas.height = height;

                // Apply orientation transforms
                switch(orientation) {
                    case 2: ctx.transform(-1, 0, 0, 1, width, 0); break;
                    case 3: ctx.transform(-1, 0, 0, -1, width, height); break;
                    case 4: ctx.transform(1, 0, 0, -1, 0, height); break;
                    case 5: ctx.transform(0, 1, 1, 0, 0, 0); break;
                    case 6: ctx.transform(0, 1, -1, 0, height, 0); break;
                    case 7: ctx.transform(0, -1, -1, 0, height, width); break;
                    case 8: ctx.transform(0, -1, 1, 0, 0, width); break;
                }

                ctx.drawImage(img, 0, 0);
                resolve({
                    data: ctx.getImageData(0, 0, width, height).data,
                    width: width,
                    height: height
                });
            });
        };
        img.onerror = reject;
        img.src = imageSrc;
    });
}

// Calculate MSE and PSNR
function calculateMetrics(original, stego) {
    let sum = bigInt(0);
    const length = Math.min(original.length, stego.length);
    
    for (let i = 0; i < length; i += 4) { // Process per pixel (RGBA)
        const rDiff = original[i] - stego[i];
        const gDiff = original[i+1] - stego[i+1];
        const bDiff = original[i+2] - stego[i+2];
        
        sum = sum.add(bigInt(rDiff).pow(2))
                 .add(bigInt(gDiff).pow(2))
                 .add(bigInt(bDiff).pow(2));
    }
    
    const mse = sum.divide(length / 4 * 3).toJSNumber();
    const psnr = 10 * Math.log10((255 ** 2) / mse);
    
    return { mse, psnr };
}

// Event handlers
$(document).ready(function() {
    // Original image upload
    $('#originalFile').change(function() {
        handleImageUpload(this, '#originalPreview', (data) => {
            originalImageData = data;
        });
    });

    // Stego image upload
    $('#stegoFile').change(function() {
        handleImageUpload(this, '#stegoPreview', (data) => {
            stegoImageData = data;
        });
    });

    // Calculate button
    $('#calculateBtn').click(async function() {
        const $btn = $(this);
        $btn.prop('disabled', true);
        $btn.find('.spinner-border').removeClass('d-none');
        $('#psnrError').addClass('d-none');

        try {
            if (!originalImageData || !stegoImageData) {
                throw new Error('Harap upload kedua gambar terlebih dahulu!');
            }

            if (originalImageData.width !== stegoImageData.width || 
                originalImageData.height !== stegoImageData.height) {
                throw new Error(`
                    Ukuran gambar tidak sama!<br>
                    <div class="d-flex justify-content-between mt-2">
                        <span>Original:</span>
                        <span>${originalImageData.width} x ${originalImageData.height}</span>
                    </div>
                    <div class="d-flex justify-content-between">
                        <span>Stego:</span>
                        <span>${stegoImageData.width} x ${stegoImageData.height}</span>
                    </div>
                `);
            }

            const { mse, psnr } = calculateMetrics(originalImageData.data, stegoImageData.data);
            
            $('#mseValue').text(mse.toFixed(2));
            $('#psnrValue').text(psnr.toFixed(2) + ' dB');
            $('#psnrResult').removeClass('d-none');

        } catch (error) {
            $('#psnrError').html(`❌ ${error.message}`).removeClass('d-none');
        } finally {
            $btn.prop('disabled', false);
            $btn.find('.spinner-border').addClass('d-none');
        }
    });

    // Clear button
    $('#clearBtn').click(function() {
        $('#originalFile, #stegoFile').val('');
        $('#originalPreview, #stegoPreview').attr('src', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=');
        $('#psnrResult').addClass('d-none');
        $('#psnrError').addClass('d-none');
        originalImageData = null;
        stegoImageData = null;
    });
});