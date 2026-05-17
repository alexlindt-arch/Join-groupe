function changeForm(form1, form2) {
    let nodisplay = document.getElementById(form1);
    let display = document.getElementById(form2);
    nodisplay.classList.add('d-none');
    display.classList.remove('d-none');
    checkActualForm(form1, form2);
}

function checkActualForm(form1, form2) {
    if (form2 == 'login') {
        document.getElementById('signup-btn').classList.remove('d-none');
    } else {
        document.getElementById('signup-btn').classList.add('d-none');
    }
}

function validateSignupForm() {
    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const passwordConfirm = document.getElementById('passwordConfirm').value;
    const checkPolicy = document.getElementById('checkPolicy').checked;
    const btn = document.getElementById('signupSubmitBtn');

    const isValid = name && email && password && passwordConfirm && password === passwordConfirm && checkPolicy;
    btn.disabled = !isValid;
}