let bankAccounts = JSON.parse(localStorage.getItem('homeBankData')) || {
    "7777 7777": { owner: "Главный Банкир 👑", balance: 100000, cvv: "8354" }
};

let myAccountNumber = ""; 
const ADMIN_NUMBER = "7777 7777";
let html5QrCode = null; 

window.addEventListener('DOMContentLoaded', () => {
    let savedNumber = localStorage.getItem('activeBankSession');
    if (savedNumber && bankAccounts[savedNumber]) {
        autoLogin(savedNumber);
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
        nextAccountNumber = generateAccountNumber();
        document.getElementById('reg-generated-number').innerText = nextAccountNumber;
    } else {
        document.getElementById('login-zone').style.display = 'block';
        document.getElementById('register-zone').style.display = 'none';
    }
}

function createAccount() {
    const nameInput = document.getElementById('reg-name');
    const cvvInput = document.getElementById('reg-custom-cvv');
    const name = nameInput.value.trim();
    const customCVV = cvvInput.value.trim();
    
    if (name === "") { alert("Пожалуйста, введите имя!"); return; }
    if (customCVV.length !== 3 || isNaN(customCVV)) { alert("Ошибка! Детский CVV код должен состоять из 3 цифр!"); return; }
    
    bankAccounts[nextAccountNumber] = { owner: name, balance: 0, cvv: customCVV };
    saveToStorage();
    
    alert(`🎉 Аккаунт создан!\nНомер счета: ${nextAccountNumber}`);
    switchZone('login');
    document.getElementById('login-number').value = nextAccountNumber;
    nameInput.value = ""; cvvInput.value = "";
}

function loginAccount() {
    const numberInput = document.getElementById('login-number').value.trim();
    const cvvInput = document.getElementById('login-cvv').value.trim();
    
    bankAccounts = JSON.parse(localStorage.getItem('homeBankData')) || bankAccounts;
    
    if (!bankAccounts[ADMIN_NUMBER]) {
        bankAccounts[ADMIN_NUMBER] = { owner: "Главный Банкир 👑", balance: 100000, cvv: "8354" };
        saveToStorage();
    }

    if (!bankAccounts[numberInput] || bankAccounts[numberInput].cvv !== cvvInput) {
        alert("Неверные данные для входа!"); return;
    }
    
    localStorage.setItem('activeBankSession', numberInput);
    autoLogin(numberInput);
}

function autoLogin(accountNumber) {
    myAccountNumber = accountNumber;
    
    if (myAccountNumber === ADMIN_NUMBER) {
        document.getElementById('display-name').innerText = bankAccounts[myAccountNumber].owner;
        document.getElementById('admin-tag').style.display = "inline-block";
        document.getElementById('admin-deposit-zone').style.display = "block";
        document.getElementById('transfer-title').innerText = "🎁 Выдать монеты на счет ребенка";
        document.getElementById('transfer-btn').innerText = "Начислить монеты за задание ➡️";
    } else {
        document.getElementById('display-name').innerText = "Привет, " + bankAccounts[myAccountNumber].owner + "! 👋";
        document.getElementById('admin-tag').style.display = "none";
        document.getElementById('admin-deposit-zone').style.display = "none";
        document.getElementById('transfer-title').innerText = "💸 Перевод на другой счет";
        document.getElementById('transfer-btn').innerText = "Совершить перевод ➡️";
    }
    
    document.getElementById('display-number').innerText = myAccountNumber;
    document.getElementById('display-cvv').innerText = bankAccounts[myAccountNumber].cvv;
    document.getElementById('login-zone').style.display = "none";
    document.getElementById('account-zone').style.display = "block";
    
    document.getElementById('qr-block').style.display = "none";
    document.getElementById('qr-container-wrapper').style.display = "none";
    document.getElementById('qr-container').innerHTML = "";
    
    updateUI();
}

function logout() {
    stopScanner();
    localStorage.removeItem('activeBankSession');
    myAccountNumber = "";
    document.getElementById('account-zone').style.display = "none";
    document.getElementById('login-zone').style.display = "block";
}

// Открытие блока настройки QR-кода
function toggleQRCodeZone() {
    let qrBlock = document.getElementById('qr-block');
    if (qrBlock.style.display === "none") {
        qrBlock.style.display = "block";
        document.getElementById('qr-container-wrapper').style.display = "none";
        document.getElementById('qr-requested-amount').value = "";
    } else {
        qrBlock.style.display = "none";
    }
}

// ГЕНЕРАЦИЯ QR-КОДА С УКАЗАННОЙ СУММОЙ
function generateQRWithAmount() {
    const amountInput = document.getElementById('qr-requested-amount');
    const amount = parseInt(amountInput.value);
    let qrContainer = document.getElementById('qr-container');
    
    if (isNaN(amount) || amount <= 0) {
        alert("Пожалуйста, введите корректную сумму монет!");
        return;
    }
    
    qrContainer.innerHTML = ""; // очищаем старый код
    
    // Зашиваем данные в формате: "номер_счета|сумма"
    let qrDataString = `${myAccountNumber}|${amount}`;
    
    new QRCode(qrContainer, {
        text: qrDataString,
        width: 180,
        height: 180
    });
    
    document.getElementById('qr-container-wrapper').style.display = "block";
}

// СКАНИРОВАНИЕ И РАСПОЗНАВАНИЕ QR-КОДА С СУММОЙ
function startScanner() {
    const readerElement = document.getElementById('reader');
    readerElement.style.display = "block";

    if (html5QrCode) { stopScanner(); }

    html5QrCode = new Html5Qrcode("reader");

    html5QrCode.start(
        { facingMode: "environment" }, 
        { fps: 10, qrbox: 250 },
        (decodedText) => {
            // Проверяем, зашита ли внутри сумма перевода (есть ли символ '|')
            if (decodedText.includes('|')) {
                let parts = decodedText.split('|'); // Разрезаем строку по палочке
                let scanAccountNumber = parts[0];
                let scanAmount = parts[1];
                
                // Подставляем данные в поля перевода автоматически!
                document.getElementById('target-account-number').value = scanAccountNumber;
                document.getElementById('transfer-amount').value = scanAmount;
                
                alert(`QR-код распознан!\nПолучатель: ${bankAccounts[scanAccountNumber] ? bankAccounts[scanAccountNumber].owner : scanAccountNumber}\nСумма: ${scanAmount} монет`);
            } else {
                // Если отсканировали старый QR-код, где была только информация о номере счета
                document.getElementById('target-account-number').value = decodedText;
                document.getElementById('transfer-amount').value = ""; // сумму пусть введут сами
                alert(`Распознан номер счета: ${decodedText}\nСумму введите вручную.`);
            }
            
            stopScanner();
        },
        (errorMessage) => {}
    ).catch((err) => {
        console.error("Ошибка запуска камеры:", err);
        alert("Не удалось запустить камеру. Проверьте разрешения камеры и протокол HTTPS!");
        readerElement.style.display = "none";
    });
}

function stopScanner() {
    if (html5QrCode) {
        html5QrCode.stop().then(() => {
            document.getElementById('reader').style.display = "none";
            html5QrCode = null;
        }).catch((err) => {
            console.error(err);
            document.getElementById('reader').style.display = "none";
            html5QrCode = null;
        });
    }
}

function addMoney() {
    const amountInput = document.getElementById('deposit-amount');
    const amount = parseInt(amountInput.value);
    if (isNaN(amount) || amount <= 0) { alert("Введите правильную сумму!"); return; }
    bankAccounts[myAccountNumber].balance += amount;
    saveToStorage(); updateUI(); amountInput.value = "";
}

function transferMoney() {
    const targetNumber = document.getElementById('target-account-number').value.trim();
    const amountInput = document.getElementById('transfer-amount');
    const amount = parseInt(amountInput.value);
    
    bankAccounts = JSON.parse(localStorage.getItem('homeBankData')) || bankAccounts;
    
    if (isNaN(amount) || amount <= 0) { alert("Укажите корректную сумму!"); return; }
    if (amount > bankAccounts[myAccountNumber].balance) { alert("В казне не хватает монет!"); return; }
    if (!bankAccounts[targetNumber]) { alert("Счет получателя не найден!"); return; }
    if (targetNumber === myAccountNumber) { alert("Нельзя переводить самому себе!"); return; }
    
    bankAccounts[myAccountNumber].balance -= amount;
    bankAccounts[targetNumber].balance += amount;
    
    saveToStorage(); updateUI();
    amountInput.value = ""; document.getElementById('target-account-number').value = "";
    
    alert(`Успешно переведено ${amount} монет! 🎉`);
}

function updateUI() {
    document.getElementById('balance').innerText = bankAccounts[myAccountNumber].balance;
}

window.addEventListener('storage', function(event) {
    if (event.key === 'homeBankData' && myAccountNumber !== "") {
        bankAccounts = JSON.parse(event.newValue);
        updateUI();
    }
});