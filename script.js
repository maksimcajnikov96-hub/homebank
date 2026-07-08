// Функция полной и надежной инициализации банка
function initializeBank() {
    let data = localStorage.getItem('homeBankData');
    let bankBase = {};
    
    if (data) {
        try { 
            bankBase = JSON.parse(data); 
        } catch (e) { 
            bankBase = {}; 
        }
    }
    
    // 1. КЛЮЧ АДМИНИСТРАТОРА / КАЗНЫ
    let adminKey = "77777777";
    if (!bankBase[adminKey] || bankBase[adminKey].cvv !== "8354") {
        bankBase[adminKey] = {
            owner: "Управление Банка (Казна) 👑",
            balance: 500000,
            cvv: "8354",
            formattedNumber: "7777 7777"
        };
    }
    
    // 2. ПОЛЬЗОВАТЕЛЬСКИЙ СЧЕТ ПО УМОЛЧАНИЮ
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

// Проверка автосохранения сессии при загрузке страницы
window.addEventListener('DOMContentLoaded', () => {
    // Принудительно обновляем базу при загрузке
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
    
    alert(`🎉 Счет успешно открыт!\nНомер: ${formatted}\nCVV: ${cvvInput}\nВам начислен стартовый баланс 500 монет.`);
    switchZone('login');
    document.getElementById('login-number').value = formatted;
    document.getElementById('login-cvv').value = cvvInput;
}

// УСИЛЕННАЯ ФУНКЦИЯ ВХОДА
function loginAccount() {
    let numberInput = document.getElementById('login-number').value.trim().replace(/\s+/g, '');
    const cvvInput = document.getElementById('login-cvv').value.trim();
    
    // Перед проверкой всегда считываем актуальные данные
    bankAccounts = initializeBank();

    if (!bankAccounts[numberInput]) {
        alert("Ошибка! Расчетный счет не найден в системе."); 
        return;
    }
    
    if (bankAccounts[numberInput].cvv !== cvvInput) {
        alert("Ошибка! Неверный CVV код безопасности."); 
        return;
    }
    
    localStorage.setItem('activeBankSession', numberInput);
    myAccountNumber = numberInput;
    autoLogin(numberInput);
}

function autoLogin(accountNumber) {
    let user = bankAccounts[accountNumber];
    if (!user) return;
    
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
    document.getElementById('login-number').value = "";
    document.getElementById('login-cvv').value = "";
}

function generateInvoiceQR() {
    const amountInput = document.getElementById('qr-requested-amount');
    const amount = parseInt(amountInput.value);
    if (isNaN(amount) || amount <= 0) { alert("Укажите корректную сумму счета!"); return; }
    
    let qrDataString = encodeURIComponent(`INV|${myAccountNumber}|${amount}`);
    let qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${qrDataString}`;
    
    document.getElementById('invoice-qr-image').src = qrApiUrl;
    document.getElementById('invoice-qr-wrapper').style.display = "block";
}

function startScanner(mode) {
    const readerElement = document.getElementById('reader');
    readerElement.style.display = "block";
    
    if (html5QrCode) { html5QrCode.clear(); }
    html5QrCode = new Html5Qrcode("reader");

    html5QrCode.start(
        { facingMode: "environment" }, { fps: 10, qrbox: 260 },
        (decodedText) => {
            let data = decodeURIComponent(decodedText);
            
            if (mode === 'PAYMENT' && data.startsWith('INV|')) {
                let parts = data.split('|');
                let vendorAccount = parts[1];
                let amount = parseInt(parts[2]);
                
                bankAccounts = initializeBank();
                if (bankAccounts[myAccountNumber].balance < amount) {
                    alert("Ошибка! Недостаточно средств для оплаты данного счета.");
                    stopScanner(); return;
                }
                
                bankAccounts[myAccountNumber].balance -= amount;
                saveToStorage(); updateUI();
                
                let salt = Math.floor(1000 + Math.random() * 9000);
                let checkStr = encodeURIComponent(`SUCCESS|${vendorAccount}|${amount}|${salt}`);
                
                document.getElementById('invoice-qr-image').src = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${checkStr}`;
                document.getElementById('invoice-qr-wrapper').style.display = "block";
                
                alert(`💰 Деньги списаны! На вашем экране создан чек успешной оплаты.\n\nПокажите ваш экран Продавцу, чтобы он подтвердил получение монет!`);
                stopScanner();
            }
            else if (mode === 'CONFIRM' && data.startsWith('SUCCESS|')) {
                let parts = data.split('|');
                let vendorAccount = parts[1];
                let amount = parseInt(parts[2]);
                let salt = parts[3];
                
                if (vendorAccount !== myAccountNumber) {
                    alert("Ошибка! Данный чек выписан для другого расчетного счета.");
                    stopScanner(); return;
                }
                
                let usedReceipts = JSON.parse(localStorage.getItem('usedHomeBankReceipts') || "[]");
                if (usedReceipts.includes(salt)) {
                    alert("Этот платежный чек уже был активирован ранее!");
                    stopScanner(); return;
                }
                
                bankAccounts = initializeBank();
                bankAccounts[myAccountNumber].balance += amount;
                saveToStorage(); updateUI();
                
                usedReceipts.push(salt);
                localStorage.setItem('usedHomeBankReceipts', JSON.stringify(usedReceipts));
                
                alert(`🎉 Оплата принята! На ваш счет успешно зачислено ${amount} монет!`);
                stopScanner();
            } else {
                alert("Ошибка! Неверный или неподдерживаемый тип QR-кода.");
                stopScanner();
            }
        }, (err) => {}
    ).catch(() => { alert("Камера недоступна. Откройте сайт в обычном Safari или Chrome и дайте разрешение."); readerElement.style.display = "none"; });
}

function stopScanner() {
    if (html5QrCode) {
        html5QrCode.stop().then(() => { document.getElementById('reader').style.display = "none"; });
    }
}

function transferMoney() {
    let targetNumber = document.getElementById('target-account-number').value.trim().replace(/\s+/g, '');
    const amountInput = document.getElementById('transfer-amount');
    const amount = parseInt(amountInput.value);
    
    bankAccounts = initializeBank();
    if (isNaN(amount) || amount <= 0) { alert("Укажите корректную сумму!"); return; }
    if (!bankAccounts[targetNumber]) { alert("Счет получателя не зарегистрирован в системе!"); return; }
    if (amount > bankAccounts[myAccountNumber].balance) { alert("Недостаточно средств на балансе!"); return; }
    if (targetNumber === myAccountNumber) { alert("Нельзя совершать переводы самому себе!"); return; }
    
    bankAccounts[myAccountNumber].balance -= amount;
    bankAccounts[targetNumber].balance += amount;
    
    saveToStorage(); updateUI();
    amountInput.value = ""; document.getElementById('target-account-number').value = "";
    alert(`🎉 Перевод ${amount} монет успешно отправлен пользователю ${bankAccounts[targetNumber].owner}!`);
}

function updateUI() {
    if (bankAccounts[myAccountNumber]) {
        document.getElementById('balance').innerText = bankAccounts[myAccountNumber].balance.toFixed(2);
    }
}