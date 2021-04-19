const authURL = 'https://api.ecoledirecte.com/v3/login.awp';
const gradesURLStart = 'https://api.ecoledirecte.com/v3/eleves/';
const gradesURLEnd = '/notes.awp?verbe=get&=';

const form = document.querySelector('form');
form.addEventListener('submit', handleConnectionButton);

const loader = document.getElementById('loader');
const usrInput = document.getElementById('usr-input');
const pwdInput = document.getElementById('pwd-input');
const invalidText = document.getElementById('invalid-text');

const totalAveragePrefix = '<strong>Moyenne générale:</strong> ';

function handleConnectionButton(event) {
    event.preventDefault();

    if (usrInput.value === '') {
        usrInput.classList.add('invalid');
        invalidText.innerHTML = "Mettre un nom d'utilisateur";
    } else {
        usrInput.classList.remove('invalid');
    }

    if (pwdInput.value === '') {
        pwdInput.classList.add('invalid');
        invalidText.innerHTML = "Mettre un mot de passe";
    } else {
        pwdInput.classList.remove('invalid');
    }
        
    if (usrInput.value === '' && pwdInput.value === '') {
        invalidText.innerHTML = "Mettre un nom d'utilisateur et un mot de passe";
    }

    if (usrInput.value === '' || pwdInput.value === '') {
        invalidText.classList.remove('no-display');
        return;
    }

    invalidText.classList.add('no-display');
    
    console.log("Username: " + usrInput.value + " Password: " + pwdInput.value);

    connectToEC(usrInput.value, pwdInput.value);
}


function connectToEC(usr, pwd) {
    loader.classList.remove('no-display');

    (async () => {
        const rawResponse = await fetch(authURL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: 'data={\n"identifiant": "' + usr +'",\n"motdepasse": "'+ pwd +'"\n}'
        });
        const content = await rawResponse.json();
        console.log('Getting the token...');

        if (content.code === 505) {
            invalidText.innerHTML = content.message;
            invalidText.classList.remove('no-display');

            console.log('The username or/and password is wrong');

            console.log(content.token);
        } else if (content.code === 200 || content.token.length > 0) {
            console.log('Got the token');

            getAverages(content.token, String(content.data.accounts[0].id));

            return;
        } else {
            invalidText.innerHTML = 'unknow error';
            invalidText.classList.remove('no-display');

            console.log('Unknow error');
        }

        loader.classList.add('no-display');
    })();
}


function getAverages(token, id) {
    (async () => {
          const rawResponse = await fetch(gradesURLStart + String(id) + gradesURLEnd, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: 'data={\n"token": "' + token +'",\n}'
        });
        const content = await rawResponse.json();
        console.log('Getting the grades...');

        if (content.code === 520) {
            invalidText.innerHTML = content.message;
            invalidText.classList.remove('no-display');

            console.log('The token is wrong');
        } else if (content.code === 200) {
            console.log('Got the grades');

            let averages = processAverages(content.data, 3);
            console.log(averages)

            displayAveragesPage(averages);
        } else {
            invalidText.innerHTML = 'unknow error';
            invalidText.classList.remove('no-display');

            console.log(content);

            console.log('Unknow error');
        }
    })();
}


function parseValue(str) {
    return parseFloat(str.replace(',', '.'));
}


function roundDec(x) {
    return Math.round(x * 10) / 10;
}


function processAverages(data, periodName) {
    let periodId = { 1: 0, 2: 2, 3: 3 }[periodName];
    let period = data.periodes[periodId];

    let subjects = period.ensembleMatieres.disciplines
        .map((discipline) => {
            let grades = data.notes
                .filter((grade) => grade.codePeriode === period.codePeriode && grade.codeMatiere === discipline.codeMatiere)
                .map((grade) => ({
                    coef: parseValue(grade.coef),
                    value: roundDec(parseValue(grade.valeur) / parseValue(grade.noteSur) * 20)
                }))
                .filter((grade) => grade.value === grade.value);

            let average = roundDec(grades.reduce((sum, grade) => sum + grade.value * grade.coef, 0) / grades.reduce((sum, grade) => sum + grade.coef, 0));

            return {
                average,
                coef: discipline.coef,
                grades,
                title: discipline.discipline
            };
        })
        .filter((subject) => subject.average === subject.average);
;
    let average = roundDec(subjects.reduce((sum, subject) => sum + subject.average * subject.coef, 0) / subjects.reduce((sum, subject) => sum + subject.coef, 0));

    return { average, subjects };
}


function displayAveragesPage(averages) {
    document.getElementById('login-container').classList.add('no-display');
    document.getElementById('averages-container').classList.remove('no-display');

    document.getElementById('total-average').innerHTML = totalAveragePrefix + averages.average.toString();

    let table = document.getElementById('subjects-averages-table');

    averages.subjects.forEach(function (item, index) {
        row = table.insertRow();
        subject = row.insertCell(0);
        average = row.insertCell(1);

        subjectText = document.createTextNode(item.title);
        averageText = document.createTextNode(item.average);

        subject.appendChild(subjectText);
        average.appendChild(averageText);

    });
}
