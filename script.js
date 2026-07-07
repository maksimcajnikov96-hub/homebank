// Загружаем базу данных. Если хранилище пустое, сразу создаем аккаунт Банкира (Папы)
let bankAccounts = JSON.parse(localStorage.getItem('homeBankData')) || {
    "7777 7777": { owner: "Главный Банкир 👑", balance: 100000, cvv: "8354" }
};

let myAccountNumber = ""; // Номер счета текущего пользователя
const ADMIN_NUMBER = "7777 7777";

// Генерация случайного номера счета
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

// РЕГИСТРАЦИЯ ДЕТЕЙ
function createAccount() {
    const nameInput = document.getElementById('reg-name');
    const cvvInput = document.getElementById('reg-custom-cvv');
    
    const name = nameInput.value.trim();
    const customCVV = cvvInput.value.trim();
    
    if (name === "") {
        alert("Пожалуйста, введите имя!");
        return;
    }
    
    if (customCVV.length !== 3 || isNaN(customCVV)) {
        alert("Ошибка! Детский CVV код должен состоять из 3 цифр!");
        return;
    }
    
    // Защита: дети не могут зарегистрировать админский номер счета
    if (nextAccountNumber === ADMIN_NUMBER) {
        nextAccountNumber = generateAccountNumber();
    }
    
    bankAccounts[nextAccountNumber] = {
        owner: name,
        balance: 0, // Дети начинают с 0 монет, пока не выполнят задание!
        cvv: customCVV
    };
    
    saveToStorage();
    
    alert(`🎉 Аккаунт для ребенка создан!\nИмя: ${name}\nНомер счета: ${nextAccountNumber}\nCVV код: ${customCVV}`);
    
    let clearNumber = nextAccountNumber;
    switchZone('login');
    document.getElementById('login-number').value = clearNumber;
    
    nameInput.value = "";
    cvvInput.value = "";
}

// АВТОРИЗАЦИЯ (ВХОД)
function loginAccount() {
    const numberInput = document.getElementById('login-number').value.trim();
    const cvvInput = document.getElementById('login-cvv').value.trim();
    
    bankAccounts = JSON.parse(localStorage.getItem('homeBankData')) || bankAccounts;
    
    // Всегда проверяем, чтобы аккаунт администратора был на месте
    if (!bankAccounts[ADMIN_NUMBER]) {
        bankAccounts[ADMIN_NUMBER] = { owner: "Главный Банкир 👑", balance: 100000, cvv: "8354" };
        saveToStorage();
    }

    if (!bankAccounts[numberInput]) {
        alert("Неверный номер счета!");
        return;
    }
    
    if (bankAccounts[numberInput].cvv !== cvvInput) {
        alert("Неверный CVV код!");
        return;
    }
    
    myAccountNumber = numberInput;
    
    // Настраиваем интерфейс в зависимости от того, кто вошел
    if (myAccountNumber === ADMIN_NUMBER) {
        // Вошел Папа (Администратор)
        document.getElementById('display-name').innerText = bankAccounts[myAccountNumber].owner;
        document.getElementById('admin-tag').style.display = "inline-block";
        document.getElementById('admin-deposit-zone').style.display = "block"; // Показываем печать монет
        document.getElementById('transfer-title').innerText = "🎁 Выдать монеты на счет ребенка";
        document.getElementById('transfer-btn').innerText = "Начислить монеты за задание ➡️";
    } else {
        // Вошел ребенок
        document.getElementById('display-name').innerText = "Привет, " + bankAccounts[myAccountNumber].owner + "! 👋";
        document.getElementById('admin-tag').style.display = "none";
        document.getElementById('admin-deposit-zone').style.display = "none"; // Прячем печать монет
        document.getElementById('transfer-title').innerText = "💸 Перевод на другой счет";
        document.getElementById('transfer-btn').innerText = "Совершить перевод ➡️";
    }
    
    document.getElementById('display-number').innerText = myAccountNumber;
    document.getElementById('display-cvv').innerText = bankAccounts[myAccountNumber].cvv;
    
    document.getElementById('login-zone').style.display = "none";
    document.getElementById('account-zone').style.display = "block";
    
    updateUI();
}

// ВЫХОД
function logout() {
    myAccountNumber = "";
    document.getElementById('login-number').value = "";
    document.getElementById('login-cvv').value = "";
    document.getElementById('account-zone').style.display = "none";
    document.getElementById('login-zone').style.display = "block";
}

// Пополнение счета (Доступно только Папе)
function addMoney() {
    const amountInput = document.getElementById('deposit-amount');
    const amount = parseInt(amountInput.value);
    
    if (isNaN(amount) || amount <= 0) {
        alert("Введите правильную сумму!");
        return;
    }
    
    bankAccounts[myAccountNumber].balance += amount;
    saveToStorage();
    updateUI();
    amountInput.value = "";
    alert(`Успешно напечатано и внесено ${amount} монет в казну банка!`);
}

// Перевод монет (Выдача наград детям)
function transferMoney() {
    const targetNumber = document.getElementById('target-account-number').value.trim();
    const amountInput = document.getElementById('transfer-amount');
    const amount = parseInt(amountInput.value);
    
    bankAccounts = JSON.parse(localStorage.getItem('homeBankData')) || bankAccounts;
    
    if (isNaN(amount) || amount <= 0) {
        alert("Укажите корректную сумму!");
        return;
    }
    
    if (amount > bankAccounts[myAccountNumber].balance) {
        alert("В казне не хватает монет! Напечатайте еще через кнопку пополнения.");
        return;
    }
    
    if (!bankAccounts[targetNumber]) {
        alert("Счет получателя не найден!");
        return;
    }
    
    if (targetNumber === myAccountNumber) {
        alert("Нельзя переводить самому себе!");
        return;
    }
    
    bankAccounts[myAccountNumber].balance -= amount;
    bankAccounts[targetNumber].balance += amount;
    
    saveToStorage();
    updateUI();
    
    amountInput.value = "";
    document.getElementById('target-account-number').value = "";
    
    if (myAccountNumber === ADMIN_NUMBER) {
        alert(`🎉 Монеты за задание успешно выданы!\n${amount} монет отправлено для ${bankAccounts[targetNumber].owner}!`);
    } else {
        alert(`Успешно переведено ${amount} монет! 🎉`);
    }
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