/* ==========================================================================
   LOGIN.JS – Alle Funktionen für Login, Registrierung und Passwort-Reset
   ==========================================================================
   
   Diese Datei steuert die index.html Seite (Login-Seite).
   Sie enthält Funktionen für:
   1. Zwischen den Formularen wechseln (Login ↔ Registrierung)
   2. Einloggen
   3. Als Gast einloggen
   4. Registrieren
   5. Passwort vergessen
   6. Passwort zurücksetzen
   ========================================================================== */

/* ==========================================================================
   FORMULAR-WECHSEL – Zwischen den verschiedenen Formularen umschalten
   ========================================================================== */

/**
 * Wechselt zwischen zwei Formularen (z.B. von Login zu Registrierung).
 * 
 * @param {string} currentForm   - ID des aktuellen Formulars (wird versteckt)
 * @param {string} targetForm        - ID des Ziel-Formulars (wird angezeigt)
 * 
 * Beispiel: switchForm('login_section', 'registration_section')
 */
function switchForm(currentForm, targetForm) {
    // Aktuelles Formular verstecken
    document.getElementById(currentForm).classList.add('d-none');

    // Ziel-Formular anzeigen
    document.getElementById(targetForm).classList.remove('d-none');

    // "Noch kein Konto?" Button anpassen
    updateSignupButton(targetForm);
}

/**
 * Zeigt oder versteckt den "Noch kein Konto? Registrieren" Button.
 * Er soll nur sichtbar sein wenn das login-form aktiv ist.
 * 
 * @param {string} activeForm - ID des gerade aktiven Formulars
 */
function updateSignupButton(activeForm) {
    const signupBtn = document.getElementById('signup_btn');
    if (!signupBtn) return;

    if (activeForm === 'login_section') {
        signupBtn.classList.remove('d-none');
    } else {
        signupBtn.classList.add('d-none');
    }
}

/* ==========================================================================
   EINLOGGEN
   ========================================================================== */

/**
 * Prüft die Logindaten und meldet den Benutzer an.
 * 
 * Holt E-Mail und Passwort aus den Eingabefeldern,
 * sucht den Benutzer in der Liste und loggt ihn ein.
 */
async function login() {
    // Eingabewerte holen
    const email    = document.getElementById('login_email').value.trim();
    const passwort = document.getElementById('login_passwort').value;
    const merken   = document.getElementById('login_merken')?.checked || false;

    // Prüfen ob die Felder ausgefüllt sind
    if (!email || !passwort) {
        benachrichtigungAnzeigen('../assets/img/fail.png', 'Bitte E-Mail und Passwort eingeben!');
        return;
    }

    // Alle Benutzer laden und passenden finden
    await alleBenutzerLaden();
    eingeloggterBenutzer = alleBenutzer.find(
        b => b.email === email && b.passwort === passwort
    );

    if (eingeloggterBenutzer) {
        // Erfolgreich: Benutzer einloggen
        benutzerEinloggen(eingeloggterBenutzer, merken);
    } else {
        // Fehler: Nachricht anzeigen
        benachrichtigungAnzeigen('../assets/img/fail.png', 'E-Mail oder Passwort falsch!');
    }
}

/* ==========================================================================
   GAST-LOGIN
   ========================================================================== */

/**
 * Meldet einen Gastbenutzer an ohne Registrierung.
 * 
 * Wenn noch kein Gast-Account existiert, wird einer erstellt.
 * Der Gast-Account hat feste Zugangsdaten: gast@gast.de / gast
 */
async function gastEinloggen() {
    // Alle Benutzer laden
    await alleBenutzerLaden();

    // Prüfen ob schon ein Gast-Account existiert
    let gastBenutzer = alleBenutzer.find(
        b => b.email === 'gast@gast.de' && b.passwort === 'gast'
    );

    // Wenn noch kein Gast-Account: einen erstellen
    if (!gastBenutzer) {
        const svg = avatarErstellen('Gast Benutzer');
        gastBenutzer = {
            id: Date.now(),
            name: 'Gast',
            email: 'gast@gast.de',
            passwort: 'gast',
            svg: svg.outerHTML,     // SVG als Text speichern
            aufgaben: [],
            kontakte: []
        };
        alleBenutzer.push(gastBenutzer);
        await dateiSpeichern('benutzer', alleBenutzer);
    }

    // Als Gast einloggen (nur für diese Sitzung, nicht dauerhaft merken)
    benutzerEinloggen(gastBenutzer, false);
}

/* ==========================================================================
   REGISTRIERUNG
   ========================================================================== */

/**
 * Registriert einen neuen Benutzer.
 * 
 * Sammelt die Formulardaten, prüft ob die Passwörter übereinstimmen
 * und legt den neuen Benutzer an.
 */
async function register() {
    // Formulardaten holen
    const name              = document.getElementById('reg_name').value.trim();
    const email             = document.getElementById('reg_email').value.trim();
    const passwort          = document.getElementById('reg_passwort').value;
    const passwortWiederh   = document.getElementById('reg_passwort_wiederholen').value;
    const datenschutzAkz    = document.getElementById('reg_datenschutz').checked;

    // Grundlegende Validierung (Prüfung der Eingaben)
    if (!name || !email || !passwort) {
        benachrichtigungAnzeigen('', 'Bitte alle Felder ausfüllen!');
        return;
    }

    if (!datenschutzAkz) {
        benachrichtigungAnzeigen('', 'Bitte Datenschutzbestimmungen akzeptieren!');
        return;
    }

    // Passwörter vergleichen
    if (passwort !== passwortWiederh) {
        benachrichtigungAnzeigen('', 'Die Passwörter stimmen nicht überein!');
        return;
    }

    // Alle Benutzer laden
    await alleBenutzerLaden();

    // Prüfen ob E-Mail bereits existiert
    const emailExistiert = alleBenutzer.find(b => b.email === email);
    if (emailExistiert) {
        benachrichtigungAnzeigen('', 'Diese E-Mail ist bereits registriert!');
        return;
    }

    // Avatar für neuen Benutzer erstellen
    const svg = avatarErstellen(name);

    // Neuen Benutzer als Objekt anlegen
    const neuerBenutzer = {
        id: Date.now(),                 // Eindeutige ID = aktuelle Zeit in Millisekunden
        name: name,
        email: email,
        passwort: passwort,
        svg: svg.outerHTML,             // Avatar als Text-String
        aufgaben: [],                   // Leere Aufgabenliste
        kontakte: []                    // Kontaktliste (wird gleich befüllt)
    };

    // Alle bestehenden Benutzer (außer Gast) als Kontakte für den neuen Benutzer eintragen
    const echteBenutzer = alleBenutzer.filter(b => b.email !== 'gast@gast.de');
    echteBenutzer.forEach((benutzer, i) => {
        neuerBenutzer.kontakte.push({
            id:        neuerBenutzer.id + i + 1,
            name:      benutzer.name,
            email:     benutzer.email,
            telefon:   '',
            monogramm: benutzer.svg
        });
    });

    // Den neuen Benutzer als Kontakt bei allen bestehenden Benutzern (außer Gast) eintragen
    echteBenutzer.forEach((benutzer, i) => {
        benutzer.kontakte.push({
            id:        neuerBenutzer.id + echteBenutzer.length + i + 1,
            name:      name,
            email:     email,
            telefon:   '',
            monogramm: svg.outerHTML
        });
    });

    // In die Benutzerliste hinzufügen
    alleBenutzer.push(neuerBenutzer);

    // Speichern
    await dateiSpeichern('benutzer', alleBenutzer);

    // Erfolgsnachricht und zurück zum Login
    benachrichtigungAnzeigen('', 'Erfolgreich registriert!');
    switchForm('registration_section', 'login_section');
}

/**
 * Überprüft das Registrierungsformular und aktiviert/deaktiviert den Registrieren-Button.
 * 
 * Wird bei jeder Eingabe im Formular aufgerufen (oninput).
 */
function validateRegistrationForm() {
    const name           = document.getElementById('reg_name')?.value.trim();
    const email          = document.getElementById('reg_email')?.value.trim();
    const passwort       = document.getElementById('reg_passwort')?.value;
    const passwortWiedh  = document.getElementById('reg_passwort_wiederholen')?.value;
    const datenschutz    = document.getElementById('reg_datenschutz')?.checked;
    const btn            = document.getElementById('reg_submit_btn');

    if (!btn) return;

    // Button aktivieren wenn alle Felder korrekt ausgefüllt sind
    const allesGueltig = name && email && passwort && passwortWiedh
        && passwort === passwortWiedh && datenschutz;

    btn.disabled = !allesGueltig;
}

/* ==========================================================================
   PASSWORT VERGESSEN
   ========================================================================== */

/**
 * Simuliert das Senden einer E-Mail mit Reset-Anleitung.
 * 
 * HINWEIS: Mit Firebase Auth kann man hier echte E-Mails senden!
 * Funktion: firebase.auth().sendPasswordResetEmail(email)
 */
async function passwortResetEmailSenden() {
    const email = document.getElementById('reset_email').value.trim();

    if (!email) {
        benachrichtigungAnzeigen('../assets/img/fail.png', 'Bitte E-Mail eingeben!');
        return;
    }

    // Prüfen ob E-Mail registriert ist
    await alleBenutzerLaden();
    const benutzerGefunden = alleBenutzer.find(b => b.email === email);

    if (!benutzerGefunden) {
        benachrichtigungAnzeigen('../assets/img/fail.png', 'E-Mail nicht gefunden!');
        return;
    }

    // E-Mail wird simuliert – zum Reset-Formular wechseln
    // In echtem Projekt: Firebase-E-Mail senden
    switchForm('passwort_vergessen_bereich', 'passwort_reset_bereich');
    benachrichtigungAnzeigen('../assets/img/check.svg', 'Bitte neues Passwort eingeben!');
}

/**
 * Setzt das Passwort auf ein neues Passwort zurück.
 */
async function passwortZuruecksetzen() {
    const email             = document.getElementById('reset_email').value.trim();
    const neuesPasswort     = document.getElementById('neues_passwort').value;
    const passwortWiederh   = document.getElementById('neues_passwort_wiederholen').value;

    // Passwörter vergleichen
    if (neuesPasswort !== passwortWiederh) {
        benachrichtigungAnzeigen('../assets/img/fail.png', 'Die Passwörter stimmen nicht überein!');
        return;
    }

    if (!neuesPasswort || neuesPasswort.length < 6) {
        benachrichtigungAnzeigen('../assets/img/fail.png', 'Passwort muss mindestens 6 Zeichen haben!');
        return;
    }

    // Benutzer finden und Passwort aktualisieren
    await alleBenutzerLaden();
    const benutzer = alleBenutzer.find(b => b.email === email);

    if (benutzer) {
        await passwortAktualisieren(benutzer, neuesPasswort);
        benachrichtigungAnzeigen('../assets/img/check.svg', 'Passwort erfolgreich geändert!');
        switchForm('passwort_reset_bereich', 'login_section');
    }
}

/* ==========================================================================
   SEITEN-INITIALISIERUNG
   ========================================================================== */

/**
 * Initialisiert die Login-Seite beim Laden.
 * Lädt vorhandene Benutzer aus dem Speicher.
 */
async function loginSeiteInitialisieren() {
    await alleBenutzerLaden();
}
