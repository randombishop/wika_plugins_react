const BALANCE_UNIT = 1000000000000;
const WIKA_TO_USD = 0.02 ;


function copyToClipboard(inputId) {
    var copyText = document.getElementById(inputId);
    copyText.select();
    document.execCommand("copy");
}

function convertToWika(value) {
    return value / BALANCE_UNIT;
}

function formatWika(value) {
    if (value != null) {
        return value.toFixed(4) + ' W';
    } else {
        return '-';
    }
}

function wikaToUsd(value) {
    if (value!=null) {
        return value * WIKA_TO_USD ;
    } else {
        return null;
    }
}

function formatUsd(value) {
    if (value != null) {
        return value.toFixed(2) + ' US$';
    } else {
        return '-';
    }
}

function shortenText(text) {
    const maxLength = 50;
    if (text == null) {
        return "";
    } else if (text.length > maxLength) {
        return text.substr(0, maxLength) + '...';
    } else {
        return text;
    }
}

function hexToBytes(hex) {
    if (hex == null) {
        return null;
    }
    if (hex.substr(0, 2) === '0x') {
        hex = hex.substr(2);
    }
    for (var bytes = [], c = 0; c < hex.length; c += 2) {
        bytes.push(parseInt(hex.substr(c, 2), 16));
    }
    return bytes;
}

function bytesToString(array) {
    if (array==null) return null ;
    var out, i, len, c;
    var char2, char3;

    out = "";
    len = array.length;
    i = 0;
    while (i < len) {
        c = array[i++];
        switch (c >> 4) {
            case 0:
            case 1:
            case 2:
            case 3:
            case 4:
            case 5:
            case 6:
            case 7:
                // 0xxxxxxx
                out += String.fromCharCode(c);
                break;
            case 12:
            case 13:
                // 110x xxxx   10xx xxxx
                char2 = array[i++];
                out += String.fromCharCode(((c & 0x1F) << 6) | (char2 & 0x3F));
                break;
            case 14:
                // 1110 xxxx  10xx xxxx  10xx xxxx
                char2 = array[i++];
                char3 = array[i++];
                out += String.fromCharCode(((c & 0x0F) << 12) |
                    ((char2 & 0x3F) << 6) |
                    ((char3 & 0x3F) << 0));
                break;
            default:
                break;
        }
    }
    return out;
}

function parseError(result) {
    console.log(JSON.stringify(result));
    if (result.dispatchError) {
        try {
            let data = result.dispatchError.asModule;
            let index = data.index;
            let error = data.error;
            return "Transaction error (" + index + "," + error + ")";
        } catch (err) {
            return "Transaction error";
        }
    } else {
        return null;
    }
}


export {copyToClipboard, convertToWika, formatWika, wikaToUsd, formatUsd, shortenText, hexToBytes, bytesToString, parseError} ;
