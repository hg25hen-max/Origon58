/* =========================================================
   ORIGON58
   Cofre pessoal criptografado
   =========================================================

   Recursos:
   - 3 senhas de acesso
   - Verificadores derivados com PBKDF2 + SHA-256
   - Cofre inteiro criptografado no localStorage
   - AES-GCM
   - Cada dado possui sua própria senha
   - Cada dado pode ser salvo em .enc
   - Descriptografia de .enc externo
   - Limpeza do cofre
   - Limpeza de temporários
   - Funcionamento offline com Service Worker
   - Nenhuma senha é armazenada em texto puro

   ========================================================= */


/* =========================================================
   CONFIGURAÇÕES
   ========================================================= */

const CONFIG_KEY = "origon58_config_v6";
const VAULT_KEY = "origon58_vault_v6";

const CONFIG_VERSION = 6;
const VAULT_VERSION = 6;
const ITEM_VERSION = 5;

const PBKDF2_ITERATIONS = 250000;

const TEXT_ENCODER = new TextEncoder();
const TEXT_DECODER = new TextDecoder();


/* =========================================================
   ESTADO TEMPORÁRIO
   ========================================================= */

let currentVaultKey = null;
let currentVaultSalt = null;
let currentVaultData = [];

let temporaryBackupData = null;


/* =========================================================
   ELEMENTOS DO HTML
   ========================================================= */

const setupScreen = document.getElementById("setupScreen");
const loginScreen = document.getElementById("loginScreen");
const vaultScreen = document.getElementById("vaultScreen");

const setupForm = document.getElementById("setupForm");
const loginForm = document.getElementById("loginForm");

const setupPassword1 = document.getElementById("setupPassword1");
const setupPassword1Confirm = document.getElementById("setupPassword1Confirm");

const setupPassword2 = document.getElementById("setupPassword2");
const setupPassword2Confirm = document.getElementById("setupPassword2Confirm");

const setupPassword3 = document.getElementById("setupPassword3");
const setupPassword3Confirm = document.getElementById("setupPassword3Confirm");

const loginPassword1 = document.getElementById("loginPassword1");
const loginPassword2 = document.getElementById("loginPassword2");
const loginPassword3 = document.getElementById("loginPassword3");

const setupMessage = document.getElementById("setupMessage");
const loginMessage = document.getElementById("loginMessage");

const lockButton = document.getElementById("lockButton");
const logoutButton = document.getElementById("logoutButton");

const addDataButton = document.getElementById("addDataButton");
const dataList = document.getElementById("dataList");
const dataCount = document.getElementById("dataCount");

const clearVaultButton = document.getElementById("clearVaultButton");
const clearTemporaryButton = document.getElementById("clearTemporaryButton");
const decryptSavedButton = document.getElementById("decryptSavedButton");


/* =========================================================
   MODAL — ADICIONAR DADO
   ========================================================= */

const addDataModal = document.getElementById("addDataModal");

const newDataText = document.getElementById("newDataText");
const newDataPassword = document.getElementById("newDataPassword");
const newDataPasswordConfirm =
  document.getElementById("newDataPasswordConfirm");

const cancelAddDataButton =
  document.getElementById("cancelAddDataButton");

const encryptDataButton =
  document.getElementById("encryptDataButton");

const addDataMessage =
  document.getElementById("addDataMessage");


/* =========================================================
   MODAL — LIMPAR COFRE
   ========================================================= */

const clearVaultModal =
  document.getElementById("clearVaultModal");

const clearVaultPassword =
  document.getElementById("clearVaultPassword");

const clearVaultPasswordConfirm =
  document.getElementById("clearVaultPasswordConfirm");

const cancelClearVaultButton =
  document.getElementById("cancelClearVaultButton");

const confirmClearVaultButton =
  document.getElementById("confirmClearVaultButton");

const clearVaultMessage =
  document.getElementById("clearVaultMessage");


/* =========================================================
   MODAL — DESCRIPTOGRAFAR DADO SALVO
   ========================================================= */

const decryptSavedModal =
  document.getElementById("decryptSavedModal");

const savedDataFile =
  document.getElementById("savedDataFile");

const savedDataPassword =
  document.getElementById("savedDataPassword");

const cancelDecryptSavedButton =
  document.getElementById("cancelDecryptSavedButton");

const confirmDecryptSavedButton =
  document.getElementById("confirmDecryptSavedButton");

const decryptSavedMessage =
  document.getElementById("decryptSavedMessage");

const savedDataResult =
  document.getElementById("savedDataResult");

const savedDataResultText =
  document.getElementById("savedDataResultText");


/* =========================================================
   INICIALIZAÇÃO
   ========================================================= */

document.addEventListener("DOMContentLoaded", initialize);


async function initialize() {

  try {

    registerEvents();

    registerServiceWorker();

    hideAllScreens();

    const config = loadConfig();

    if (!config) {

      showScreen(setupScreen);

      return;
    }

    showScreen(loginScreen);

  } catch (error) {

    console.error("Erro na inicialização:", error);

    hideAllScreens();

    showScreen(loginScreen);

    setMessage(
      loginMessage,
      "Não foi possível iniciar o cofre.",
      "error"
    );
  }
}


/* =========================================================
   EVENTOS
   ========================================================= */

function registerEvents() {

  setupForm.addEventListener(
    "submit",
    handleSetup
  );

  loginForm.addEventListener(
    "submit",
    handleLogin
  );

  lockButton.addEventListener(
    "click",
    lockVault
  );

  logoutButton.addEventListener(
    "click",
    lockVault
  );

  addDataButton.addEventListener(
    "click",
    openAddDataModal
  );

  cancelAddDataButton.addEventListener(
    "click",
    closeAddDataModal
  );

  encryptDataButton.addEventListener(
    "click",
    handleEncryptNewData
  );

  clearVaultButton.addEventListener(
    "click",
    openClearVaultModal
  );

  cancelClearVaultButton.addEventListener(
    "click",
    closeClearVaultModal
  );

  confirmClearVaultButton.addEventListener(
    "click",
    handleClearVault
  );

  clearTemporaryButton.addEventListener(
    "click",
    clearTemporaryState
  );

  decryptSavedButton.addEventListener(
    "click",
    openDecryptSavedModal
  );

  cancelDecryptSavedButton.addEventListener(
    "click",
    closeDecryptSavedModal
  );

  confirmDecryptSavedButton.addEventListener(
    "click",
    handleDecryptSaved
  );
}


/* =========================================================
   SERVICE WORKER
   ========================================================= */

function registerServiceWorker() {

  if (!("serviceWorker" in navigator)) {
    return;
  }

  window.addEventListener(
    "load",
    () => {

      navigator.serviceWorker
        .register("sw.js")
        .catch(error => {
          console.warn(
            "Service Worker não pôde ser registrado:",
            error
          );
        });

    }
  );
}


/* =========================================================
   TELAS
   ========================================================= */

function hideAllScreens() {

  setupScreen.classList.add("hidden");
  loginScreen.classList.add("hidden");
  vaultScreen.classList.add("hidden");
}


function showScreen(screen) {

  hideAllScreens();

  screen.classList.remove("hidden");

  window.scrollTo({
    top: 0,
    behavior: "auto"
  });
}


/* =========================================================
   CONFIGURAÇÃO
   ========================================================= */

function loadConfig() {

  try {

    const raw = localStorage.getItem(CONFIG_KEY);

    if (!raw) {
      return null;
    }

    const config = JSON.parse(raw);

    if (
      !config ||
      config.version !== CONFIG_VERSION ||
      !Array.isArray(config.passwordVerifiers) ||
      config.passwordVerifiers.length !== 3 ||
      !config.vaultSalt
    ) {

      return null;
    }

    return config;

  } catch (error) {

    console.error(
      "Erro ao carregar configuração:",
      error
    );

    return null;
  }
}


/* =========================================================
   CRIAR ACESSO
   ========================================================= */

async function handleSetup(event) {

  event.preventDefault();

  clearMessage(setupMessage);

  const password1 = setupPassword1.value;
  const password1Confirm = setupPassword1Confirm.value;

  const password2 = setupPassword2.value;
  const password2Confirm = setupPassword2Confirm.value;

  const password3 = setupPassword3.value;
  const password3Confirm = setupPassword3Confirm.value;


  if (!password1 || !password2 || !password3) {

    setMessage(
      setupMessage,
      "Preencha as três senhas.",
      "error"
    );

    return;
  }


  if (password1 !== password1Confirm) {

    setMessage(
      setupMessage,
      "A primeira senha não confere.",
      "error"
    );

    return;
  }


  if (password2 !== password2Confirm) {

    setMessage(
      setupMessage,
      "A segunda senha não confere.",
      "error"
    );

    return;
  }


  if (password3 !== password3Confirm) {

    setMessage(
      setupMessage,
      "A terceira senha não confere.",
      "error"
    );

    return;
  }


  if (
    password1.length < 4 ||
    password2.length < 4 ||
    password3.length < 4
  ) {

    setMessage(
      setupMessage,
      "Cada senha precisa ter pelo menos 4 caracteres.",
      "error"
    );

    return;
  }


  try {

    disableButtonTemporarily(
      setupForm.querySelector("button[type='submit']")
    );


    const verifier1 =
      await createPasswordVerifier(password1);

    const verifier2 =
      await createPasswordVerifier(password2);

    const verifier3 =
      await createPasswordVerifier(password3);


    const vaultSaltBytes =
      crypto.getRandomValues(
        new Uint8Array(16)
      );


    const vaultSalt =
      bytesToBase64(vaultSaltBytes);


    const config = {

      version: CONFIG_VERSION,

      createdAt:
        new Date().toISOString(),

      passwordVerifiers: [
        verifier1,
        verifier2,
        verifier3
      ],

      vaultSalt
    };


    localStorage.setItem(
      CONFIG_KEY,
      JSON.stringify(config)
    );


    const vaultKey =
      await deriveVaultKey(
        password1,
        password2,
        password3,
        vaultSalt
      );


    currentVaultKey = vaultKey;
    currentVaultSalt = vaultSalt;
    currentVaultData = [];


    await saveEncryptedVault();


    setupForm.reset();

    setMessage(
      setupMessage,
      "Acesso criado com sucesso.",
      "success"
    );


    setTimeout(() => {

      clearMessage(setupMessage);

      showScreen(loginScreen);

      loginForm.reset();

    }, 700);


  } catch (error) {

    console.error(
      "Erro ao criar acesso:",
      error
    );

    setMessage(
      setupMessage,
      "Não foi possível criar o acesso.",
      "error"
    );
  }
}


/* =========================================================
   LOGIN
   ========================================================= */

async function handleLogin(event) {

  event.preventDefault();

  clearMessage(loginMessage);


  const password1 =
    loginPassword1.value;

  const password2 =
    loginPassword2.value;

  const password3 =
    loginPassword3.value;


  if (
    !password1 ||
    !password2 ||
    !password3
  ) {

    setMessage(
      loginMessage,
      "por que quer entrar aqui 🤨",
      "error"
    );

    return;
  }


  try {

    const config = loadConfig();

    if (!config) {

      showScreen(setupScreen);

      return;
    }


    const valid1 =
      await verifyPassword(
        password1,
        config.passwordVerifiers[0]
      );

    const valid2 =
      await verifyPassword(
        password2,
        config.passwordVerifiers[1]
      );

    const valid3 =
      await verifyPassword(
        password3,
        config.passwordVerifiers[2]
      );


    if (
      !valid1 ||
      !valid2 ||
      !valid3
    ) {

      setMessage(
        loginMessage,
        "por que quer entrar aqui 🤨",
        "error"
      );

      loginForm.reset();

      return;
    }


    const vaultKey =
      await deriveVaultKey(
        password1,
        password2,
        password3,
        config.vaultSalt
      );


    currentVaultKey = vaultKey;
    currentVaultSalt = config.vaultSalt;


    await loadEncryptedVault();


    loginForm.reset();

    clearMessage(loginMessage);

    renderVault();

    showScreen(vaultScreen);

  } catch (error) {

    console.error(
      "Erro no login:",
      error
    );

    currentVaultKey = null;

    setMessage(
      loginMessage,
      "por que quer entrar aqui 🤨",
      "error"
    );

    loginForm.reset();
  }
}


/* =========================================================
   VERIFICADOR DE SENHA
   ========================================================= */

async function createPasswordVerifier(password) {

  const saltBytes =
    crypto.getRandomValues(
      new Uint8Array(16)
    );

  const salt =
    bytesToBase64(saltBytes);


  const hash =
    await derivePBKDF2Bytes(
      password,
      saltBytes,
      PBKDF2_ITERATIONS,
      32
    );


  return {

    algorithm: "PBKDF2",

    hash: "SHA-256",

    iterations: PBKDF2_ITERATIONS,

    salt,

    verifier:
      bytesToBase64(hash)
  };
}


async function verifyPassword(
  password,
  verifier
) {

  if (!verifier) {
    return false;
  }


  const saltBytes =
    base64ToBytes(
      verifier.salt
    );


  const derived =
    await derivePBKDF2Bytes(
      password,
      saltBytes,
      verifier.iterations,
      32
    );


  return constantTimeEqual(
    derived,
    base64ToBytes(
      verifier.verifier
    )
  );
}


/* =========================================================
   CHAVE DO COFRE
   ========================================================= */

async function deriveVaultKey(
  password1,
  password2,
  password3,
  vaultSalt
) {

  const combined =
    password1 +
    "\u0000" +
    password2 +
    "\u0000" +
    password3;


  const saltBytes =
    base64ToBytes(vaultSalt);


  const keyMaterial =
    await crypto.subtle.importKey(
      "raw",
      TEXT_ENCODER.encode(combined),
      "PBKDF2",
      false,
      ["deriveKey"]
    );


  return crypto.subtle.deriveKey(

    {
      name: "PBKDF2",

      salt: saltBytes,

      iterations: PBKDF2_ITERATIONS,

      hash: "SHA-256"
    },

    keyMaterial,

    {
      name: "AES-GCM",

      length: 256
    },

    false,

    [
      "encrypt",
      "decrypt"
    ]
  );
}


/* =========================================================
   PBKDF2
   ========================================================= */

async function derivePBKDF2Bytes(
  password,
  salt,
  iterations,
  length
) {

  const keyMaterial =
    await crypto.subtle.importKey(

      "raw",

      TEXT_ENCODER.encode(password),

      {
        name: "PBKDF2"
      },

      false,

      ["deriveBits"]
    );


  const bits =
    await crypto.subtle.deriveBits(

      {
        name: "PBKDF2",

        salt,

        iterations,

        hash: "SHA-256"
      },

      keyMaterial,

      length * 8
    );


  return new Uint8Array(bits);
}


/* =========================================================
   COFRE CRIPTOGRAFADO
   ========================================================= */

async function saveEncryptedVault() {

  if (!currentVaultKey) {
    throw new Error(
      "Chave do cofre indisponível."
    );
  }


  const payload = {

    version: VAULT_VERSION,

    updatedAt:
      new Date().toISOString(),

    items:
      currentVaultData
  };


  const plaintext =
    TEXT_ENCODER.encode(
      JSON.stringify(payload)
    );


  const iv =
    crypto.getRandomValues(
      new Uint8Array(12)
    );


  const ciphertext =
    await crypto.subtle.encrypt(

      {
        name: "AES-GCM",

        iv
      },

      currentVaultKey,

      plaintext
    );


  const vaultPackage = {

    format:
      "Origon58 Encrypted Vault",

    version:
      VAULT_VERSION,

    cipher: {

      name:
        "AES-GCM",

      iv:
        bytesToBase64(iv),

      ciphertext:
        bytesToBase64(
          new Uint8Array(ciphertext)
        )
    }
  };


  localStorage.setItem(
    VAULT_KEY,
    JSON.stringify(vaultPackage)
  );
}


async function loadEncryptedVault() {

  if (!currentVaultKey) {
    throw new Error(
      "Chave do cofre indisponível."
    );
  }


  const raw =
    localStorage.getItem(
      VAULT_KEY
    );


  if (!raw) {

    currentVaultData = [];

    await saveEncryptedVault();

    return;
  }


  const vaultPackage =
    JSON.parse(raw);


  if (
    vaultPackage.format !==
      "Origon58 Encrypted Vault" ||
    vaultPackage.version !==
      VAULT_VERSION
  ) {

    throw new Error(
      "Formato do cofre inválido."
    );
  }


  const iv =
    base64ToBytes(
      vaultPackage.cipher.iv
    );

  const ciphertext =
    base64ToBytes(
      vaultPackage.cipher.ciphertext
    );


  const plaintext =
    await crypto.subtle.decrypt(

      {
        name: "AES-GCM",

        iv
      },

      currentVaultKey,

      ciphertext
    );


  const payload =
    JSON.parse(
      TEXT_DECODER.decode(
        plaintext
      )
    );


  if (
    !payload ||
    payload.version !==
      VAULT_VERSION ||
    !Array.isArray(payload.items)
  ) {

    throw new Error(
      "Dados do cofre inválidos."
    );
  }


  currentVaultData =
    payload.items;
}


/* =========================================================
   RENDERIZAR COFRE
   ========================================================= */

function renderVault() {

  dataList.innerHTML = "";

  dataCount.textContent =
    String(
      currentVaultData.length
    );


  if (
    currentVaultData.length === 0
  ) {

    const empty =
      document.createElement("p");

    empty.className =
      "panel-description";

    empty.textContent =
      "Nenhum dado criptografado no cofre.";

    dataList.appendChild(empty);

    return;
  }


  currentVaultData.forEach(
    (item, index) => {

      const card =
        createDataCard(
          item,
          index
        );

      dataList.appendChild(card);
    }
  );
}


/* =========================================================
   CARD DE DADO
   ========================================================= */

function createDataCard(
  item,
  index
) {

  const card =
    document.createElement("article");

  card.className =
    "data-card";


  const title =
    document.createElement("h3");

  title.textContent =
    item.title ||
    `Dado ${index + 1}`;


  const status =
    document.createElement("p");

  status.className =
    "panel-description";

  status.textContent =
    "🔐 Informação criptografada";


  const actions =
    document.createElement("div");

  actions.className =
    "data-actions";


  const decryptButton =
    document.createElement("button");

  decryptButton.type =
    "button";

  decryptButton.className =
    "secondary-button";

  decryptButton.textContent =
    "🔓 DESCRIPTOGRAFAR";


  const saveButton =
    document.createElement("button");

  saveButton.type =
    "button";

  saveButton.className =
    "secondary-button";

  saveButton.textContent =
    "💾 SALVAR .ENC";


  const deleteButton =
    document.createElement("button");

  deleteButton.type =
    "button";

  deleteButton.className =
    "danger-button";

  deleteButton.textContent =
    "🗑️ EXCLUIR";


  decryptButton.addEventListener(
    "click",
    () => decryptVaultItem(index)
  );


  saveButton.addEventListener(
    "click",
    () => saveVaultItemAsEnc(index)
  );


  deleteButton.addEventListener(
    "click",
    () => deleteVaultItem(index)
  );


  actions.appendChild(
    decryptButton
  );

  actions.appendChild(
    saveButton
  );

  actions.appendChild(
    deleteButton
  );


  card.appendChild(title);
  card.appendChild(status);
  card.appendChild(actions);


  return card;
}


/* =========================================================
   ADICIONAR DADO
   ========================================================= */

function openAddDataModal() {

  clearMessage(addDataMessage);

  newDataText.value = "";
  newDataPassword.value = "";
  newDataPasswordConfirm.value = "";

  addDataModal.classList.remove(
    "hidden"
  );
}


function closeAddDataModal() {

  addDataModal.classList.add(
    "hidden"
  );

  clearMessage(addDataMessage);

  newDataText.value = "";
  newDataPassword.value = "";
  newDataPasswordConfirm.value = "";
}


async function handleEncryptNewData() {

  clearMessage(addDataMessage);


  const text =
    newDataText.value.trim();

  const password =
    newDataPassword.value;

  const passwordConfirm =
    newDataPasswordConfirm.value;


  if (!text) {

    setMessage(
      addDataMessage,
      "Digite uma informação.",
      "error"
    );

    return;
  }


  if (!password) {

    setMessage(
      addDataMessage,
      "Crie uma senha para este dado.",
      "error"
    );

    return;
  }


  if (
    password !== passwordConfirm
  ) {

    setMessage(
      addDataMessage,
      "As senhas deste dado não conferem.",
      "error"
    );

    return;
  }


  try {

    disableButtonTemporarily(
      encryptDataButton
    );


    const encryptedItem =
      await encryptIndividualItem(
        text,
        password
      );


    currentVaultData.push(
      encryptedItem
    );


    await saveEncryptedVault();


    closeAddDataModal();

    renderVault();


  } catch (error) {

    console.error(
      "Erro ao criptografar dado:",
      error
    );

    setMessage(
      addDataMessage,
      "Não foi possível criptografar o dado.",
      "error"
    );
  }
}


/* =========================================================
   CRIPTOGRAFIA INDIVIDUAL
   ========================================================= */

async function encryptIndividualItem(
  text,
  password
) {

  const salt =
    crypto.getRandomValues(
      new Uint8Array(16)
    );


  const iv =
    crypto.getRandomValues(
      new Uint8Array(12)
    );


  const key =
    await deriveItemKey(
      password,
      salt
    );


  const plaintext =
    TEXT_ENCODER.encode(text);


  const ciphertext =
    await crypto.subtle.encrypt(

      {
        name: "AES-GCM",

        iv
      },

      key,

      plaintext
    );


  const id =
    createRandomId();


  return {

    format:
      "Origon58 Secure Item",

    version:
      ITEM_VERSION,

    id,

    title:
      `Dado ${id}`,

    createdAt:
      new Date().toISOString(),

    kdf: {

      name:
        "PBKDF2",

      hash:
        "SHA-256",

      iterations:
        PBKDF2_ITERATIONS,

      salt:
        bytesToBase64(salt)
    },

    cipher: {

      name:
        "AES-GCM",

      iv:
        bytesToBase64(iv)
    },

    ciphertext:
      bytesToBase64(
        new Uint8Array(ciphertext)
      )
  };
}


async function deriveItemKey(
  password,
  salt
) {

  const keyMaterial =
    await crypto.subtle.importKey(

      "raw",

      TEXT_ENCODER.encode(password),

      {
        name:
          "PBKDF2"
      },

      false,

      ["deriveKey"]
    );


  return crypto.subtle.deriveKey(

    {

      name:
        "PBKDF2",

      salt,

      iterations:
        PBKDF2_ITERATIONS,

      hash:
        "SHA-256"
    },

    keyMaterial,

    {

      name:
        "AES-GCM",

      length:
        256
    },

    false,

    [
      "encrypt",
      "decrypt"
    ]
  );
}


/* =========================================================
   DESCRIPTOGRAFAR DADO DO COFRE
   ========================================================= */

async function decryptVaultItem(index) {

  const item =
    currentVaultData[index];


  if (!item) {
    return;
  }


  const password =
    window.prompt(
      "Digite a senha deste dado:"
    );


  if (
    password === null
  ) {

    return;
  }


  if (!password) {

    window.alert(
      "Senha não informada."
    );

    return;
  }


  try {

    const plaintext =
      await decryptIndividualItem(
        item,
        password
      );


    showDecryptedData(
      item,
      plaintext
    );


  } catch (error) {

    console.error(
      "Erro ao descriptografar:",
      error
    );

    window.alert(
      "Senha incorreta ou dado inválido."
    );
  }
}


async function decryptIndividualItem(
  item,
  password
) {

  if (
    !item ||
    item.format !==
      "Origon58 Secure Item" ||
    item.version !==
      ITEM_VERSION
  ) {

    throw new Error(
      "Formato de dado inválido."
    );
  }


  const salt =
    base64ToBytes(
      item.kdf.salt
    );


  const iv =
    base64ToBytes(
      item.cipher.iv
    );


  const ciphertext =
    base64ToBytes(
      item.ciphertext
    );


  const key =
    await deriveItemKey(
      password,
      salt
    );


  const plaintext =
    await crypto.subtle.decrypt(

      {
        name:
          "AES-GCM",

        iv
      },

      key,

      ciphertext
    );


  return TEXT_DECODER.decode(
    plaintext
  );
}


/* =========================================================
   MOSTRAR DADO DESCRIPTOGRAFADO
   ========================================================= */

function showDecryptedData(
  item,
  plaintext
) {

  const modal =
    document.createElement("div");

  modal.className =
    "modal";


  const box =
    document.createElement("div");

  box.className =
    "modal-box";


  const eyebrow =
    document.createElement("span");

  eyebrow.className =
    "eyebrow";

  eyebrow.textContent =
    "CONTEÚDO DESCRIPTOGRAFADO";


  const title =
    document.createElement("h2");

  title.textContent =
    item.title ||
    "Dado";


  const content =
    document.createElement("div");

  content.className =
    "result-text";

  content.textContent =
    plaintext;


  const close =
    document.createElement("button");

  close.type =
    "button";

  close.className =
    "secondary-button";

  close.textContent =
    "FECHAR";


  close.addEventListener(
    "click",
    () => modal.remove()
  );


  box.appendChild(
    eyebrow
  );

  box.appendChild(
    title
  );

  box.appendChild(
    content
  );

  box.appendChild(
    close
  );


  modal.appendChild(
    box
  );


  document.body.appendChild(
    modal
  );
}


/* =========================================================
   SALVAR .ENC
   ========================================================= */

async function saveVaultItemAsEnc(index) {

  const item =
    currentVaultData[index];


  if (!item) {
    return;
  }


  try {

    const content =
      JSON.stringify(
        item,
        null,
        2
      );


    const blob =
      new Blob(
        [content],
        {
          type:
            "application/octet-stream"
        }
      );


    const fileName =
      `origon58-${item.id}.enc`;


    if (
      "showSaveFilePicker" in window
    ) {

      const handle =
        await window.showSaveFilePicker({

          suggestedName:
            fileName,

          types: [

            {
              description:
                "Arquivo criptografado Origon58",

              accept: {

                "application/octet-stream":
                  [".enc"]

              }
            }

          ]
        });


      const writable =
        await handle.createWritable();


      await writable.write(
        blob
      );

      await writable.close();


      window.alert(
        "Arquivo .enc salvo com sucesso! 💾"
      );

      return;
    }


    const url =
      URL.createObjectURL(
        blob
      );


    const link =
      document.createElement("a");

    link.href =
      url;

    link.download =
      fileName;

    document.body.appendChild(
      link
    );

    link.click();

    link.remove();

    URL.revokeObjectURL(
      url
    );


    window.alert(
      "Arquivo .enc criado com sucesso! 💾"
    );


  } catch (error) {

    if (
      error.name ===
      "AbortError"
    ) {

      return;
    }


    console.error(
      "Erro ao salvar .enc:",
      error
    );


    window.alert(
      "Não foi possível salvar o arquivo .enc."
    );
  }
}


/* =========================================================
   EXCLUIR DADO
   ========================================================= */

async function deleteVaultItem(index) {

  const item =
    currentVaultData[index];


  if (!item) {
    return;
  }


  const confirmed =
    window.confirm(
      "Excluir este dado do cofre?"
    );


  if (!confirmed) {
    return;
  }


  currentVaultData.splice(
    index,
    1
  );


  try {

    await saveEncryptedVault();

    renderVault();

  } catch (error) {

    console.error(
      "Erro ao excluir dado:",
      error
    );

    window.alert(
      "Não foi possível atualizar o cofre."
    );
  }
}


/* =========================================================
   LIMPAR COFRE
   ========================================================= */

function openClearVaultModal() {

  clearVaultPassword.value = "";
  clearVaultPasswordConfirm.value = "";

  clearMessage(
    clearVaultMessage
  );

  clearVaultModal.classList.remove(
    "hidden"
  );
}


function closeClearVaultModal() {

  clearVaultModal.classList.add(
    "hidden"
  );

  clearVaultPassword.value = "";
  clearVaultPasswordConfirm.value = "";

  clearMessage(
    clearVaultMessage
  );
}


async function handleClearVault() {

  clearMessage(
    clearVaultMessage
  );


  const password =
    clearVaultPassword.value;

  const passwordConfirm =
    clearVaultPasswordConfirm.value;


  if (!password) {

    setMessage(
      clearVaultMessage,
      "Informe uma senha.",
      "error"
    );

    return;
  }


  if (
    password !== passwordConfirm
  ) {

    setMessage(
      clearVaultMessage,
      "As senhas não conferem.",
      "error"
    );

    return;
  }


  const config =
    loadConfig();


  if (!config) {

    setMessage(
      clearVaultMessage,
      "Configuração não encontrada.",
      "error"
    );

    return;
  }


  const valid =
    await verifyAnyAccessPassword(
      password,
      config
    );


  if (!valid) {

    setMessage(
      clearVaultMessage,
      "Senha de limpeza incorreta.",
      "error"
    );

    return;
  }


  const confirmed =
    window.confirm(
      "Tem certeza? Todos os dados do cofre serão apagados."
    );


  if (!confirmed) {
    return;
  }


  currentVaultData = [];


  try {

    await saveEncryptedVault();

    closeClearVaultModal();

    renderVault();

    window.alert(
      "Cofre limpo com sucesso."
    );

  } catch (error) {

    console.error(
      "Erro ao limpar cofre:",
      error
    );

    setMessage(
      clearVaultMessage,
      "Não foi possível limpar o cofre.",
      "error"
    );
  }
}


async function verifyAnyAccessPassword(
  password,
  config
) {

  for (
    const verifier
    of config.passwordVerifiers
  ) {

    const valid =
      await verifyPassword(
        password,
        verifier
      );


    if (valid) {
      return true;
    }
  }


  return false;
}


/* =========================================================
   LIMPAR TEMPORÁRIOS
   ========================================================= */

function clearTemporaryState() {

  temporaryBackupData = null;


  savedDataFile.value = "";

  savedDataPassword.value = "";

  savedDataResultText.textContent = "";

  savedDataResult.classList.add(
    "hidden"
  );


  clearMessage(
    decryptSavedMessage
  );


  window.alert(
    "Dados temporários do backup foram excluídos."
  );
}


/* =========================================================
   DESCRIPTOGRAFAR DADO SALVO
   ========================================================= */

function openDecryptSavedModal() {

  savedDataFile.value = "";

  savedDataPassword.value = "";

  savedDataResultText.textContent = "";

  savedDataResult.classList.add(
    "hidden"
  );


  clearMessage(
    decryptSavedMessage
  );


  decryptSavedModal.classList.remove(
    "hidden"
  );
}


function closeDecryptSavedModal() {

  decryptSavedModal.classList.add(
    "hidden"
  );


  savedDataFile.value = "";

  savedDataPassword.value = "";

  savedDataResultText.textContent = "";

  savedDataResult.classList.add(
    "hidden"
  );


  clearMessage(
    decryptSavedMessage
  );
}


async function handleDecryptSaved() {

  clearMessage(
    decryptSavedMessage
  );


  const file =
    savedDataFile.files[0];

  const password =
    savedDataPassword.value;


  if (!file) {

    setMessage(
      decryptSavedMessage,
      "Selecione um arquivo .enc.",
      "error"
    );

    return;
  }


  if (!file.name.toLowerCase().endsWith(".enc")) {

    setMessage(
      decryptSavedMessage,
      "Selecione um arquivo .enc.",
      "error"
    );

    return;
  }


  if (!password) {

    setMessage(
      decryptSavedMessage,
      "Informe a senha deste dado.",
      "error"
    );

    return;
  }


  try {

    const text =
      await file.text();


    const item =
      JSON.parse(text);


    const plaintext =
      await decryptIndividualItem(
        item,
        password
      );


    savedDataResultText.textContent =
      plaintext;


    savedDataResult.classList.remove(
      "hidden"
    );


    setMessage(
      decryptSavedMessage,
      "Dado descriptografado com sucesso!",
      "success"
    );


  } catch (error) {

    console.error(
      "Erro ao descriptografar .enc:",
      error
    );


    savedDataResultText.textContent =
      "";

    savedDataResult.classList.add(
      "hidden"
    );


    setMessage(
      decryptSavedMessage,
      "Senha incorreta ou arquivo .enc inválido.",
      "error"
    );
  }
}


/* =========================================================
   BLOQUEAR / SAIR
   ========================================================= */

function lockVault() {

  currentVaultKey = null;
  currentVaultSalt = null;
  currentVaultData = [];

  loginForm.reset();

  hideAllScreens();

  showScreen(loginScreen);
}


/* =========================================================
   MENSAGENS
   ========================================================= */

function setMessage(
  element,
  text,
  type
) {

  element.textContent =
    text;


  element.classList.remove(
    "success",
    "error"
  );


  if (type) {

    element.classList.add(
      type
    );
  }
}


function clearMessage(
  element
) {

  element.textContent = "";

  element.classList.remove(
    "success",
    "error"
  );
}


/* =========================================================
   UTILITÁRIOS
   ========================================================= */

function createRandomId() {

  const bytes =
    crypto.getRandomValues(
      new Uint8Array(6)
    );


  return Array.from(
    bytes,
    byte =>
      byte.toString(16).padStart(2, "0")
  ).join("");
}


function bytesToBase64(
  bytes
) {

  let binary = "";

  const chunkSize = 0x8000;


  for (
    let i = 0;
    i < bytes.length;
    i += chunkSize
  ) {

    binary += String.fromCharCode(
      ...bytes.subarray(
        i,
        Math.min(
          i + chunkSize,
          bytes.length
        )
      )
    );
  }


  return btoa(binary);
}


function base64ToBytes(
  base64
) {

  const binary =
    atob(base64);


  const bytes =
    new Uint8Array(
      binary.length
    );


  for (
    let i = 0;
    i < binary.length;
    i++
  ) {

    bytes[i] =
      binary.charCodeAt(i);
  }


  return bytes;
}


function constantTimeEqual(
  a,
  b
) {

  if (
    a.length !==
    b.length
  ) {

    return false;
  }


  let result = 0;


  for (
    let i = 0;
    i < a.length;
    i++
  ) {

    result |=
      a[i] ^ b[i];
  }


  return result === 0;
}


function disableButtonTemporarily(
  button
) {

  if (!button) {
    return;
  }


  button.disabled = true;


  setTimeout(() => {

    button.disabled = false;

  }, 500);
    }
