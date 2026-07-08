function initializeBank() {
    let data = localStorage.getItem('homeBankData');
    let bankBase = {};
    
    if (data) {
        try { bankBase = JSON.parse(data); } catch (e) { bankBase = {}; }
    }
    
    // Администратор (Папа)
    let adminKey = "77777777";
    if (!bankBase[adminKey]) {
        bankBase[adminKey] = {
            owner: "Главный Banker 👑",
            balance: 100000,
            cvv: "8354",
            formattedNumber: "7777 7777",
            isAdmin: true 
        };
    }
    
    // Дочка (Учетная запись по умолчанию)
    let childKey = "21535477";
    if (!bankBase[childKey]) {
        bankBase[childKey] = {
            owner: "Дочка ✨", 
            balance: 100,      
            cvv: "111",        
            formattedNumber: "2153 5477",
            isAdmin: false
        };
    }
    
    localStorage.setItem('homeBankData', JSON.stringify(bankBase));
    return bankBase;
}

let bankAccounts = initializeBank();
let myAccountNumber = ""; 

window.addEventListener('DOMContentLoaded', () => {
    let savedNumber = localStorage.getItem('activeBankSession');
    if (savedNumber) {
        savedNumber = savedNumber.replace(/\s+/g, '');
        if (savedNumber === "77777777") {
            autoLoginAdmin();
        } else if (bankAccounts[savedNumber]) {
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
        let rawGenerated = generateAccountNumber();
        document.getElementById('reg-generated-number').innerText = rawGenerated;
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
    
    let formatted = document.getElementById('reg-generated-number').innerText;
    let cleanNumber = formatted.replace(/\s+/g, ''); 
    
    bankAccounts = initializeBank();
    bankAccounts[cleanNumber] = { 
        owner: name, balance: 0, cvv: customCVV, formattedNumber: formatted, isAdmin: false
    };
    saveToStorage();
    
    alert(`🎉 Счет успешно создан!\nНомер счета: ${formatted}`);
    switchZone('login');
    document.getElementById('login-number').value = formatted;
    document.getElementById('login-cvv').value = customCVV;
    nameInput.value = ""; cvvInput.value = "";
}

function loginAccount() {
    let numberInput = document.getElementById('login-number').value.trim().replace(/\s+/g, '');
    const cvvInput = document.getElementById('login-cvv').value.trim();
    bankAccounts = initializeBank();

    if (numberInput === "77777777" && cvvInput === "8354") {
        localStorage.setItem('activeBankSession', '77777777');
        autoLoginAdmin();
        return;
    }

    if (!bankAccounts[numberInput] || bankAccounts[numberInput].cvv !== cvvInput) {
        alert("Неверные данные для входа!"); return;
    }
    
    localStorage.setItem('activeBankSession', numberInput);
    autoLogin(numberInput);
}

function autoLoginAdmin() {
    myAccountNumber = "77777777";
    bankAccounts = initializeBank();
    document.getElementById('display-name').innerText = "Главный Банкир 👑";
    document.getElementById('admin-tag').style.display = "inline-block";
    document.getElementById('admin-deposit-zone').style.display = "block";
    document.getElementById('display-number').innerText = "7777 7777";
    document.getElementById('display-cvv').innerText = "8354";
    document.getElementById('login-zone').style.display = "none";
    document.getElementById('account-zone').style.display = "block";
    
    renderQuickTransferButtons();
    updateUI();
}

function autoLogin(accountNumber) {
    myAccountNumber = accountNumber.replace(/\s+/g, '');
    let user = bankAccounts[myAccountNumber];
    
    document.getElementById('display-name').innerText = "Привет, " + user.owner + "! 👋";
    document.getElementById('admin-tag').style.display = "none";
    document.getElementById('admin-deposit-zone').style.display = "none";
    document.getElementById('display-number').innerText = user.formattedNumber || accountNumber;
    document.getElementById('display-cvv').innerText = user.cvv;
    document.getElementById('login-zone').style.display = "none";
    document.getElementById('account-zone').style.display = "block";
    
    renderQuickTransferButtons();
    updateUI();
}

function logout() {
    localStorage.removeItem('activeBankSession');
    myAccountNumber = "";
    document.getElementById('account-zone').style.display = "none";
    document.getElementById('login-zone').style.display = "block";
}

// СОЗДАНИЕ КНОПОК ДЛЯ БЫСТРОГО ВЫБОРА ПОЛЬЗОВАТЕЛЯ
function renderQuickTransferButtons() {
    let listContainer = document.getElementById('users-buttons-list');
    listContainer.innerHTML = "";
    
    let hasUsers = false;
    
    for (let id in bankAccounts) {
        if (id !== myAccountNumber) { // Не показываем самого себя
            hasUsers = true;
            let user = bankAccounts[id];
            
            let btn = document.createElement('button');
            btn.className = "quick-user-btn";
            btn.innerHTML = `👤 <b>${user.owner}</b> (Счет: ${user.formattedNumber || id})`;
            
            // При клике на кнопку имя автоматически подставится в поле ввода номера
            btn.onclick = function() {
                document.getElementById('target-account-number').value = user.formattedNumber || id;
                document.getElementById('transfer-amount').focus(); // Переводим фокус на ввод суммы
            };
            
            listContainer.appendChild(btn);
        }
    }
    
    if (!hasUsers) {
        listContainer.innerHTML = "<p style='color:#7f8c8d; font-size:14px;'>В банке пока нет других счетов.</p>";
    }
}

function addMoney() {
    const amountInput = document.getElementById('deposit-amount');
    const amount = parseInt(amountInput.value);
    if (isNaN(amount) || amount <= 0) { alert("Введите сумму!"); return; }
    bankAccounts = initializeBank();
    bankAccounts[myAccountNumber].balance += amount;
    saveToStorage(); updateUI(); amountInput.value = "";
}

// КЛАССИЧЕСКАЯ НАДЕЖНАЯ ФУНКЦИЯ ПЕРЕВОДА
function transferMoney() {
    let targetNumber = document.getElementById('target-account-number').value.trim().replace(/\s+/g, '');
    const amountInput = document.getElementById('transfer-amount');
    const amount = parseInt(amountInput.value);
    
    bankAccounts = initializeBank();
    if (isNaN(amount) || amount <= 0) { alert("Укажите сумму перевода!"); return; }
    if (!bankAccounts[targetNumber]) { alert("Счет получателя не найден в базе банка!"); return; }
    if (amount > bankAccounts[myAccountNumber].balance) { alert("Недостаточно монет на счете!"); return; }
    if (targetNumber === myAccountNumber) { alert("Нельзя переводить монеты самому себе!"); return; }
    
    // Списание и зачисление
    bankAccounts[myAccountNumber].balance -= amount;
    bankAccounts[targetNumber].balance += amount;
    
    saveToStorage(); 
    updateUI();
    
    amountInput.value = ""; 
    document.getElementById('target-account-number').value = "";
    
    alert(`🎉 Успешно переведено ${amount} монет пользователю ${bankAccounts[targetNumber].owner}!`);
}

function updateUI() {
    if (bankAccounts[myAccountNumber]) {
        document.getElementById('balance').innerText = bankAccounts[myAccountNumber].balance;
    }
}