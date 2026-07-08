function initializeBank() {
    let data = localStorage.getItem('homeBankData');
    let bankBase = {};
    
    if (data) {
        try { bankBase = JSON.parse(data); } catch (e) { bankBase = {}; }
    }
    
    // Главный расчетный счет (Управление банка)
    let adminKey = "77777777";
    if (!bankBase[adminKey] || bankBase[adminKey].cvv !== "8354") {
        bankBase[adminKey] = {
            owner: "Управление Банка (Казна) 👑",
            balance: 500000,
            cvv: "8354",
            formattedNumber: "7777 7777"
        };
    }
    
    // Второй системный расчетный счет по умолчанию
    let childKey = "21535477";
    if (!bankBase[childKey] || bankBase[childKey].cvv !== "111") {
        bankBase[childKey] = {
            owner: "Центральный расчетный счет", 
            balance: 1000,      
            cvv: "111",        
            formattedNumber: "2153 5477"
        };
    }
    
    localStorage.setItem('homeBankData', JSON.stringify(bankBase));
    return bankBase;
}

let bankAccounts = initializeBank();
let myAccountNumber = ""; 
let html5QrCode = null;

window.addEventListener('DOMContentLoaded', () => {
    bankAccounts = initializeBank();
    let savedNumber = localStorage.getItem('activeBankSession');
    if (savedNumber) {
        savedNumber = savedNumber.replace(/\s+/g, '');
        if (bankAccounts[savedNumber]) {
            myAccountNumber = savedNumber;
            autoLogin(savedNumber);
        }
    }
});

function generateAccountNumber() {
    let part1 = Math.floor(1000 + Math.random() * 9000);
    let part2 = Math.floor(1000 + Math.random() * 9000);
    return `${part1} ${part2}`;
}

function saveToStorage() {
    localStorage.setItem('homeBankData', JSON.stringify(bankAccounts));
}

function switchZone(zone) {
    if (zone === 'register') {
        document.getElementById('login-zone').style.display = 'none';
        document.getElementById('register-zone').style.display = 'block';
        document.getElementById('reg-generated-number').innerText = generateAccountNumber();
    } else {
        document.getElementById('login-zone').style.display = 'block';
        document.getElementById('register-zone').style.display = 'none';
    }
}

function createAccount() {
    const nameInput = document.getElementById('reg-name').value.trim();
    const cvvInput = document.getElementById('reg-custom-cvv').value.trim();
    
    if (nameInput === "") { alert("Введите ФИО владельца!"); return; }
    if (cvvInput.length < 3 || isNaN(cvvInput)) { alert("CVV должен содержать от 3 до 4 цифр!"); return; }
    
    let formatted = document.getElementById('reg-generated-number').innerText;
    let cleanNumber = formatted.replace(/\s+/g, ''); 
    
    bankAccounts = initializeBank();
    bankAccounts[cleanNumber] = { 
        owner: nameInput, balance: 500, cvv: cvvInput, formattedNumber: formatted
    };
    saveToStorage();
    
    alert(`🎉 Счет успешно открыт!\nНомер: ${formatted}\nCVV: ${cvvInput}`);
    switchZone('login');
    document.getElementById('login-number').value = formatted;
    document.getElementById('login-cvv').value = cvvInput;
}

function loginAccount() {
    let numberInput = document.getElementById('login-number').value.trim().replace(/\s+/g, '');
    const cvvInput = document.getElementById('login-cvv').value.trim();
    bankAccounts = initializeBank();

    if (!bankAccounts[numberInput] || bankAccounts[numberInput].cvv !== cvvInput) {
        alert("Ошибка авторизации!"); return;
    }
    
    localStorage.setItem('activeBankSession', numberInput);
    myAccountNumber = numberInput;
    autoLogin(numberInput);
}

function autoLogin(accountNumber) {
    let user = bankAccounts[accountNumber];
    document.getElementById('display-name').innerText = user.owner;
    document.getElementById('display-number').innerText = user.formattedNumber || accountNumber;
    document.getElementById('display-cvv').innerText = user.cvv;
    document.getElementById('login-zone').style.display = "none";
    document.getElementById('account-zone').style.display = "block";
    document.getElementById('invoice-qr-wrapper').style.display = "none";
    updateUI();
}

function logout() {
    localStorage.removeItem('activeBankSession');
    myAccountNumber = "";
    document.getElementById('account-zone').style.display = "none";
    document.getElementById('login-zone').style.display = "block";
}

// ГЕНЕРАЦИЯ QR СЧЕТА К ПОЛУЧЕНИЮ ДЕНЕГ
function generateInvoiceQR() {
    const amountInput = document.getElementById('qr-requested-amount');
    const amount = parseInt(amountInput.value);
    if (isNaN(amount) || amount <= 0) { alert("Укажите корректную сумму счета!"); return; }
    
    // Формируем чистую строку для шифрования в QR
    let rawTextData = `INV-${myAccountNumber}-${amount}`;
    let qrDataString = encodeURIComponent(rawTextData);
    
    let qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${qrDataString}`;
    
    document.getElementById('invoice-qr-image').src = qrApiUrl;
    document.getElementById('invoice-qr-wrapper').style.display = "block";
}

// ОБРАБОТКА ДАННЫХ ИЗ QR (Списание и зачисление монет)
function processQRData(textString) {
    if (!textString.startsWith("INV-")) {
        alert("Неверный формат платежного кода!"); return false;
    }
    
    let parts = textString.split("-");
    if (parts.length !== 3) {
        alert("Ошибка! Платёжная строка повреждена."); return false;
    }
    
    let vendorAccount = parts[1];
    let amount = parseInt(parts[2]);
    
    bankAccounts = initializeBank();
    if (amount > bankAccounts[myAccountNumber].balance) {
        alert("Недостаточно средств для проведения транзакции!"); return false;
    }
    if (vendorAccount === myAccountNumber) {
        alert("Нельзя оплачивать счет самому себе!"); return false;
    }
    
    // Перерасчёт
    bankAccounts[myAccountNumber].balance -= amount;
    bankAccounts[vendorAccount].balance += amount;
    
    saveToStorage();
    updateUI();
    
    alert(`💰 Оплата успешно проведена!\nСписано: ${amount} монет.\nПолучатель: ${bankAccounts[vendorAccount].owner}`);
    return true;
}

// РЕЖИМ А: СКАНИРОВАНИЕ КАМЕРОЙ
function startMobileScanner() {
    const readerElement = document.getElementById('reader');
    readerElement.style.display = "block";
    
    if (html5QrCode) { html5QrCode.clear(); }
    html5QrCode = new Html5Qrcode("reader");

    html5QrCode.start(
        { facingMode: "environment" }, { fps: 10, qrbox: 250 },
        (decodedText) => {
            let data = decodeURIComponent(decodedText);
            let success = processQRData(data);
            if (success) {
                html5QrCode.stop().then(() => { readerElement.style.display = "none"; });
            }
        }, (err) => {}
    ).catch((err) => {
        alert("Камера заблокирована системой браузера. Используйте ручной ввод текстового кода из QR!");
        readerElement.style.display = "none";
    });
}

// РЕЖИМ Б: АЛЬТЕРНАТИВНЫЙ РУЧНОЙ ВВОД ТЕКСТА ИЗ QR
function redeemManualQR() {
    let inputField = document.getElementById('coupon-code-input');
    let code = inputField.value.trim();
    let success = processQRData(code);
    if (success) {
        inputField.value = "";
    }
}

// ОБЫЧНЫЙ ПЕРЕВОД ПО СЧЕТУ
function transferMoney() {
    let targetNumber = document.getElementById('target-account-number').value.trim().replace(/\s+/g, '');
    const amountInput = document.getElementById('transfer-amount');
    const amount = parseInt(amountInput.value);
    
    bankAccounts = initializeBank();
    if (isNaN(amount) || amount <= 0) { alert("Укажите сумму!"); return; }
    if (!bankAccounts[targetNumber]) { alert("Получатель не найден!"); return; }
    if (amount > bankAccounts[myAccountNumber].balance) { alert("Недостаточно средств!"); return; }
    if (targetNumber === myAccountNumber) { alert("Нельзя переводить себе!"); return; }
    
    bankAccounts[myAccountNumber].balance -= amount;
    bankAccounts[targetNumber].balance += amount;
    
    saveToStorage(); updateUI();
    amountInput.value = ""; document.getElementById('target-account-number').value = "";
    alert(`🎉 Перевод ${amount} монет выполнен успешно!`);
}

function updateUI() {
    if (bankAccounts[myAccountNumber]) {
        document.getElementById('balance').innerText = bankAccounts[myAccountNumber].balance.toFixed(2);
    }
}