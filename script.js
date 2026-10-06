"use strict";

/*
==================================================
ORIGON58
PROJETO #017

Cofre pessoal criptografado.

Tecnologias:
- localStorage
- Web Crypto API
- PBKDF2
- SHA-256
- AES-GCM
- Service Worker
- Arquivos .enc

IMPORTANTE:
As senhas nunca são armazenadas em texto puro.
==================================================
*/


/* ==================================================
   CONFIGURAÇÕES
================================================== */

const CONFIG_KEY =
  "origon58_config_v2";

const VAULT_KEY =
  "origon58_vault_v2";

const CONFIG_VERSION =
  2;

const ITEM_VERSION =
  2;

const BACKUP_VERSION =
  2;

const PBKDF2_ITERATIONS =
  250000;


/* ==================================================
   ESTADO TEMPORÁRIO DA SESSÃO
================================================== */

let sessionKey =
  null;

let vaultData =
  null;

let temporaryBackup =
  null;


/* ==================================================
   ELEMENTOS
================================================== */

const setupScreen =
  document.getElementById("setupScreen");

const loginScreen =
  document.getElementById("loginScreen");

const vaultScreen =
  document.getElementById("vaultScreen");

const setupForm =
  document.getElementById("setupForm");

const loginForm =
  document.getElementById("loginForm");

const setupMessage =
  document.getElementById("setupMessage");

const loginMessage =
  document.getElementById("loginMessage");

const dataList =
  document.getElementById("dataList");

const dataCount =
  document.getElementById("dataCount");

const addDataButton =
  document.getElementById("addDataButton");

const clearVaultButton =
  document.getElementById("clearVaultButton");

const clearTemporaryButton =
  document.getElementById("clearTemporaryButton");

const logoutButton =
  document.getElementById("logoutButton");

const lockButton =
  document.getElementById("lockButton");

const backupButton =
  document.getElementById("backupButton");

const decryptButton =
  document.getElementById("decryptButton");


/* ==================================================
   MODAL — DADO
================================================== */

const addDataModal =
  document.getElementById("addDataModal");

const cancelAddDataButton =
  document.getElementById("cancelAddDataButton");

const encryptDataButton =
  document.getElementById("encryptDataButton");

const newDataText =
  document.getElementById("newDataText");

const newDataPassword =
  document.getElementById("newDataPassword");

const newDataPasswordConfirm =
  document.getElementById(
    "newDataPasswordConfirm"
  );

const addDataMessage =
  document.getElementById("addDataMessage");


/* ==================================================
   MODAL — LIMPAR COFRE
================================================== */

const clearVaultModal =
  document.getElementById("clearVaultModal");

const cancelClearVaultButton =
  document.getElementById(
    "cancelClearVaultButton"
  );

const confirmClearVaultButton =
  document.getElementById(
    "confirmClearVaultButton"
  );

const clearVaultPassword =
  document.getElementById(
    "clearVaultPassword"
  );

const clearVaultPasswordConfirm =
  document.getElementById(
    "clearVaultPasswordConfirm"
  );

const clearVaultMessage =
  document.getElementById(
    "clearVaultMessage"
  );


/* ==================================================
   MODAL — BACKUP
================================================== */

const backupModal =
  document.getElementById("backupModal");

const cancelBackupButton =
  document.getElementById(
    "cancelBackupButton"
  );

const confirmBackupButton =
  document.getElementById(
    "confirmBackupButton"
  );

const saveBackupButton =
  document.getElementById(
    "saveBackupButton"
  );

const backupPassword =
  document.getElementById(
    "backupPassword"
  );

const backupPasswordConfirm =
  document.getElementById(
    "backupPasswordConfirm"
  );

const backupMessage =
  document.getElementById(
    "backupMessage"
  );


/* ==================================================
   MODAL — RESTAURAR
================================================== */

const decryptModal =
  document.getElementById("decryptModal");

const cancelDecryptButton =
  document.getElementById(
    "cancelDecryptButton"
  );

const confirmDecryptButton =
  document.getElementById(
    "confirmDecryptButton"
  );

const backupFile =
  document.getElementById("backupFile");

const decryptPassword =
  document.getElementById(
    "decryptPassword"
  );

const decryptMessage =
  document.getElementById(
    "decryptMessage"
  );


/* ==================================================
   UTILITÁRIOS DE TEXTO
================================================== */

function textToBytes(text) {

  return new TextEncoder().encode(text);

}


function bytesToText(bytes) {

  return new TextDecoder().decode(bytes);

}


/* ==================================================
   BASE64
================================================== */

function bytesToBase64(bytes) {

  let binary =
    "";

  const chunkSize =
    0x8000;

  for (
    let i = 0;
    i < bytes.length;
    i += chunkSize
  ) {

    binary += String.fromCharCode(
      ...bytes.subarray(
        i,
        i + chunkSize
      )
    );

  }

  return btoa(binary);

}


function base64ToBytes(base64) {

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


/* ==================================================
   ALEATORIEDADE
================================================== */

function randomBytes(length) {

  return crypto.getRandomValues(
    new Uint8Array(length)
  );

}


/* ==================================================
   PBKDF2
================================================== */

async function deriveBitsFromPassword(
  password,
  salt,
  iterations = PBKDF2_ITERATIONS
) {

  const material =
    await crypto.subtle.importKey(
      "raw",
      textToBytes(password),
      "PBKDF2",
      false,
      ["deriveBits"]
    );

  return new Uint8Array(
    await crypto.subtle.deriveBits(
      {
        name: "PBKDF2",
        salt,
        iterations,
        hash: "SHA-256"
      },
      material,
      256
    )
  );

}


async function deriveAESKey(
  password,
  salt,
  iterations = PBKDF2_ITERATIONS
) {

  const material =
    await crypto.subtle.importKey(
      "raw",
      textToBytes(password),
      "PBKDF2",
      false,
      ["deriveKey"]
    );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations,
      hash: "SHA-256"
    },
    material,
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


/* ==================================================
   COMPARAÇÃO CONSTANTE
================================================== */

function constantTimeEqual(
  a,
  b
) {

  if (
    !(a instanceof Uint8Array) ||
    !(b instanceof Uint8Array)
  ) {

    return false;

  }

  if (
    a.length !==
    b.length
  ) {

    return false;

  }

  let result =
    0;

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


/* ==================================================
   VERIFICADOR DE SENHA
================================================== */

async function createPasswordVerifier(
  password
) {

  const salt =
    randomBytes(16);

  const hash =
    await deriveBitsFromPassword(
      password,
      salt
    );

  return {

    salt:
      bytesToBase64(salt),

    hash:
      bytesToBase64(hash)

  };

}


async function verifyPassword(
  password,
  verifier
) {

  const salt =
    base64ToBytes(
      verifier.salt
    );

  const expected =
    base64ToBytes(
      verifier.hash
    );

  const calculated =
    await deriveBitsFromPassword(
      password,
      salt
    );

  return constantTimeEqual(
    calculated,
    expected
  );

}


/* ==================================================
   CHAVE DO COFRE
================================================== */

function buildVaultPassword(
  passwords
) {

  return JSON.stringify(
    passwords
  );

}


async function deriveVaultKey(
  passwords,
  salt
) {

  return deriveAESKey(
    buildVaultPassword(
      passwords
    ),
    salt
  );

}


/* ==================================================
   CRIPTOGRAFIA AES-GCM
================================================== */

async function encryptText(
  text,
  key
) {

  const iv =
    randomBytes(12);

  const encrypted =
    await crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv
      },
      key,
      textToBytes(text)
    );

  return {

    iv:
      bytesToBase64(iv),

    ciphertext:
      bytesToBase64(
        new Uint8Array(
          encrypted
        )
      )

  };

}


async function decryptText(
  packageData,
  key
) {

  const iv =
    base64ToBytes(
      packageData.iv
    );

  const ciphertext =
    base64ToBytes(
      packageData.ciphertext
    );

  const decrypted =
    await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv
      },
      key,
      ciphertext
    );

  return bytesToText(
    new Uint8Array(
      decrypted
    )
  );

}


/* ==================================================
   CRIPTOGRAFIA DE JSON
================================================== */

async function encryptJSON(
  data,
  key
) {

  return encryptText(
    JSON.stringify(data),
    key
  );

}


async function decryptJSON(
  packageData,
  key
) {

  const text =
    await decryptText(
      packageData,
      key
    );

  return JSON.parse(
    text
  );

}


/* ==================================================
   LOCALSTORAGE
================================================== */

function saveConfig(
  config
) {

  localStorage.setItem(
    CONFIG_KEY,
    JSON.stringify(config)
  );

}


function getConfig() {

  const raw =
    localStorage.getItem(
      CONFIG_KEY
    );

  if (!raw) {

    return null;

  }

  try {

    return JSON.parse(raw);

  } catch {

    return null;

  }

}


function saveVaultPackage(
  vaultPackage
) {

  localStorage.setItem(
    VAULT_KEY,
    JSON.stringify(
      vaultPackage
    )
  );

}


function getVaultPackage() {

  const raw =
    localStorage.getItem(
      VAULT_KEY
    );

  if (!raw) {

    return null;

  }

  try {

    return JSON.parse(raw);

  } catch {

    return null;

  }

}


/* ==================================================
   TELA
================================================== */

function showScreen(
  screen
) {

  setupScreen.classList.add(
    "hidden"
  );

  loginScreen.classList.add(
    "hidden"
  );

  vaultScreen.classList.add(
    "hidden"
  );

  screen.classList.remove(
    "hidden"
  );

}


/* ==================================================
   MENSAGENS
================================================== */

function clearMessages() {

  setupMessage.textContent =
    "";

  loginMessage.textContent =
    "";

  addDataMessage.textContent =
    "";

  clearVaultMessage.textContent =
    "";

  backupMessage.textContent =
    "";

  decryptMessage.textContent =
    "";

}


/* ==================================================
   MODAIS
================================================== */

function openModal(
  modal
) {

  modal.classList.remove(
    "hidden"
  );

}


function closeModal(
  modal
) {

  modal.classList.add(
    "hidden"
  );

}


/* ==================================================
   LIMPAR FORMULÁRIO DE DADO
================================================== */

function resetAddDataForm() {

  newDataText.value =
    "";

  newDataPassword.value =
    "";

  newDataPasswordConfirm.value =
    "";

  addDataMessage.textContent =
    "";

}


/* ==================================================
   RENDERIZAR DADOS
================================================== */

function renderVault() {

  dataList.innerHTML =
    "";

  if (
    !vaultData ||
    !Array.isArray(
      vaultData.items
    )
  ) {

    vaultData = {
      items: []
    };

  }

  dataCount.textContent =
    vaultData.items.length;

  if (
    vaultData.items.length ===
    0
  ) {

    const empty =
      document.createElement(
        "div"
      );

    empty.className =
      "empty-state";

    empty.textContent =
      "Nenhum dado protegido ainda.";

    dataList.appendChild(
      empty
    );

    return;

  }


  vaultData.items.forEach(
    (item, index) => {

      const card =
        document.createElement(
          "article"
        );

      card.className =
        "data-card";


      const title =
        document.createElement(
          "div"
        );

      title.className =
        "data-card-title";

      title.textContent =
        `Dado ${index + 1}`;


      const text =
        document.createElement(
          "textarea"
        );

      text.className =
        "data-card-text";

      text.readOnly =
        true;

      text.value =
        item.ciphertext;


      const actions =
        document.createElement(
          "div"
        );

      actions.className =
        "data-card-actions";


      const decryptButtonItem =
        document.createElement(
          "button"
        );

      decryptButtonItem.className =
        "small-button";

      decryptButtonItem.type =
        "button";

      decryptButtonItem.textContent =
        "🔓 DESCRIPTOGRAFAR";


      const saveButtonItem =
        document.createElement(
          "button"
        );

      saveButtonItem.className =
        "small-button";

      saveButtonItem.type =
        "button";

      saveButtonItem.textContent =
        "💾 SALVAR .ENC";


      const deleteButtonItem =
        document.createElement(
          "button"
        );

      deleteButtonItem.className =
        "small-danger-button";

      deleteButtonItem.type =
        "button";

      deleteButtonItem.textContent =
        "🗑️ EXCLUIR";


      decryptButtonItem.addEventListener(
        "click",
        () =>
          decryptIndividualItem(
            item
          )
      );


      saveButtonItem.addEventListener(
        "click",
        () =>
          saveIndividualItem(
            item
          )
      );


      deleteButtonItem.addEventListener(
        "click",
        () =>
          deleteIndividualItem(
            item.id
          )
      );


      actions.appendChild(
        decryptButtonItem
      );

      actions.appendChild(
        saveButtonItem
      );

      actions.appendChild(
        deleteButtonItem
      );


      card.appendChild(
        title
      );

      card.appendChild(
        text
      );

      card.appendChild(
        actions
      );


      dataList.appendChild(
        card
      );

    }
  );

}


/* ==================================================
   SALVAR COFRE
================================================== */

async function persistVault() {

  if (!sessionKey) {

    return;

  }

  const encrypted =
    await encryptJSON(
      vaultData,
      sessionKey
    );

  const vaultPackage = {

    format:
      "Origon58 Vault",

    version:
      CONFIG_VERSION,

    iv:
      encrypted.iv,

    ciphertext:
      encrypted.ciphertext

  };

  saveVaultPackage(
    vaultPackage
  );

}


/* ==================================================
   CONFIGURAÇÃO INICIAL
================================================== */

async function createInitialAccess(
  passwords
) {

  const verifier1 =
    await createPasswordVerifier(
      passwords[0]
    );

  const verifier2 =
    await createPasswordVerifier(
      passwords[1]
    );

  const verifier3 =
    await createPasswordVerifier(
      passwords[2]
    );

  const vaultSalt =
    randomBytes(16);

  const config = {

    format:
      "Origon58 Config",

    version:
      CONFIG_VERSION,

    vaultSalt:
      bytesToBase64(
        vaultSalt
      ),

    verifiers: [

      verifier1,
      verifier2,
      verifier3

    ]

  };


  const key =
    await deriveVaultKey(
      passwords,
      vaultSalt
    );


  const initialVault = {

    format:
      "Origon58 Vault Data",

    version:
      CONFIG_VERSION,

    items: []

  };


  const encrypted =
    await encryptJSON(
      initialVault,
      key
    );


  const vaultPackage = {

    format:
      "Origon58 Vault",

    version:
      CONFIG_VERSION,

    iv:
      encrypted.iv,

    ciphertext:
      encrypted.ciphertext

  };


  saveConfig(
    config
  );

  saveVaultPackage(
    vaultPackage
  );

}


/* ==================================================
   LOGIN
================================================== */

async function authenticate(
  passwords
) {

  const config =
    getConfig();

  if (!config) {

    throw new Error(
      "CONFIG_NOT_FOUND"
    );

  }


  if (
    config.version !==
    CONFIG_VERSION
  ) {

    throw new Error(
      "INVALID_VERSION"
    );

  }


  if (
    !Array.isArray(
      config.verifiers
    ) ||
    config.verifiers.length !==
    3
  ) {

    throw new Error(
      "INVALID_CONFIG"
    );

  }


  const results =
    await Promise.all([

      verifyPassword(
        passwords[0],
        config.verifiers[0]
      ),

      verifyPassword(
        passwords[1],
        config.verifiers[1]
      ),

      verifyPassword(
        passwords[2],
        config.verifiers[2]
      )

    ]);


  if (
    !results[0] ||
    !results[1] ||
    !results[2]
  ) {

    throw new Error(
      "INVALID_PASSWORDS"
    );

  }


  const vaultSalt =
    base64ToBytes(
      config.vaultSalt
    );


  const key =
    await deriveVaultKey(
      passwords,
      vaultSalt
    );


  const vaultPackage =
    getVaultPackage();


  if (!vaultPackage) {

    throw new Error(
      "VAULT_NOT_FOUND"
    );

  }


  const decrypted =
    await decryptJSON(
      vaultPackage,
      key
    );


  if (
    !decrypted ||
    !Array.isArray(
      decrypted.items
    )
  ) {

    throw new Error(
      "INVALID_VAULT"
    );

  }


  sessionKey =
    key;

  vaultData =
    decrypted;

}


/* ==================================================
   CRIAR ACESSO
================================================== */

setupForm.addEventListener(
  "submit",
  async (event) => {

    event.preventDefault();

    clearMessages();


    const p1 =
      document.getElementById(
        "setupPassword1"
      ).value;

    const p1c =
      document.getElementById(
        "setupPassword1Confirm"
      ).value;

    const p2 =
      document.getElementById(
        "setupPassword2"
      ).value;

    const p2c =
      document.getElementById(
        "setupPassword2Confirm"
      ).value;

    const p3 =
      document.getElementById(
        "setupPassword3"
      ).value;

    const p3c =
      document.getElementById(
        "setupPassword3Confirm"
      ).value;


    if (
      !p1 ||
      !p2 ||
      !p3
    ) {

      setupMessage.textContent =
        "Preencha as três senhas.";

      return;

    }


    if (
      p1 !== p1c ||
      p2 !== p2c ||
      p3 !== p3c
    ) {

      setupMessage.textContent =
        "As confirmações das senhas não coincidem.";

      return;

    }


    try {

      setupMessage.textContent =
        "Criando o cofre...";


      await createInitialAccess(
        [
          p1,
          p2,
          p3
        ]
      );


      document.getElementById(
        "setupPassword1"
      ).value = "";

      document.getElementById(
        "setupPassword1Confirm"
      ).value = "";

      document.getElementById(
        "setupPassword2"
      ).value = "";

      document.getElementById(
        "setupPassword2Confirm"
      ).value = "";

      document.getElementById(
        "setupPassword3"
      ).value = "";

      document.getElementById(
        "setupPassword3Confirm"
      ).value = "";


      showScreen(
        loginScreen
      );


      loginMessage.textContent =
        "Acesso criado. Informe as três senhas.";

    } catch (error) {

      console.error(error);

      setupMessage.textContent =
        "Não foi possível criar o cofre.";

    }

  }
);


/* ==================================================
   ENTRAR
================================================== */

loginForm.addEventListener(
  "submit",
  async (event) => {

    event.preventDefault();

    loginMessage.textContent =
      "Verificando...";


    const p1 =
      document.getElementById(
        "loginPassword1"
      ).value;

    const p2 =
      document.getElementById(
        "loginPassword2"
      ).value;

    const p3 =
      document.getElementById(
        "loginPassword3"
      ).value;


    try {

      await authenticate(
        [
          p1,
          p2,
          p3
        ]
      );


      document.getElementById(
        "loginPassword1"
      ).value = "";

      document.getElementById(
        "loginPassword2"
      ).value = "";

      document.getElementById(
        "loginPassword3"
      ).value = "";


      loginMessage.textContent =
        "";


      renderVault();


      showScreen(
        vaultScreen
      );

    } catch (error) {

      console.error(error);

      sessionKey =
        null;

      vaultData =
        null;


      loginMessage.textContent =
        "por que quer entrar aqui 🤨";

    }

  }
);


/* ==================================================
   ADICIONAR DADO
================================================== */

addDataButton.addEventListener(
  "click",
  () => {

    resetAddDataForm();

    openModal(
      addDataModal
    );

  }
);


cancelAddDataButton.addEventListener(
  "click",
  () => {

    resetAddDataForm();

    closeModal(
      addDataModal
    );

  }
);


encryptDataButton.addEventListener(
  "click",
  async () => {

    addDataMessage.textContent =
      "";


    const text =
      newDataText.value;

    const password =
      newDataPassword.value;

    const confirmation =
      newDataPasswordConfirm.value;


    if (!text.trim()) {

      addDataMessage.textContent =
        "Digite uma informação.";

      return;

    }


    if (!password) {

      addDataMessage.textContent =
        "Crie uma senha para este dado.";

      return;

    }


    if (
      password !==
      confirmation
    ) {

      addDataMessage.textContent =
        "As senhas não coincidem.";

      return;

    }


    if (!sessionKey) {

      addDataMessage.textContent =
        "A sessão foi bloqueada.";

      return;

    }


    try {

      addDataMessage.textContent =
        "Criptografando...";


      const id =
        crypto.randomUUID();


      const salt =
        randomBytes(16);


      const itemKey =
        await deriveAESKey(
          password,
          salt
        );


      const payload = {

        format:
          "origon58-item",

        version:
          ITEM_VERSION,

        id,

        createdAt:
          new Date().toISOString(),

        text

      };


      const encrypted =
        await encryptJSON(
          payload,
          itemKey
        );


      const itemPackage = {

        format:
          "Origon58 Secure Item",

        version:
          ITEM_VERSION,

        kdf: {

          name:
            "PBKDF2",

          hash:
            "SHA-256",

          iterations:
            PBKDF2_ITERATIONS,

          salt:
            bytesToBase64(
              salt
            )

        },

        cipher: {

          name:
            "AES-GCM",

          iv:
            encrypted.iv

        },

        ciphertext:
          encrypted.ciphertext

      };


      vaultData.items.push({

        id,

        createdAt:
          payload.createdAt,

        ciphertext:
          encrypted.ciphertext,

        itemPackage

      });


      await persistVault();


      renderVault();


      resetAddDataForm();

      closeModal(
        addDataModal
      );


      alert(
        "Dado criptografado com sucesso! 🔐"
      );

    } catch (error) {

      console.error(error);

      addDataMessage.textContent =
        "Não foi possível criptografar o dado.";

    }

  }
);


/* ==================================================
   DESCRIPTOGRAFAR DADO INDIVIDUAL
================================================== */

async function decryptIndividualItem(
  item
) {

  const password =
    prompt(
      "Digite a senha deste dado:"
    );


  if (
    password ===
    null
  ) {

    return;

  }


  if (!password) {

    alert(
      "Senha não informada."
    );

    return;

  }


  try {

    const itemPackage =
      item.itemPackage;


    const salt =
      base64ToBytes(
        itemPackage.kdf.salt
      );


    const key =
      await deriveAESKey(
        password,
        salt,
        itemPackage.kdf.iterations
      );


    const plaintext =
      await crypto.subtle.decrypt(
        {
          name:
            "AES-GCM",

          iv:
            base64ToBytes(
              itemPackage.cipher.iv
            )

        },
        key,
        base64ToBytes(
          itemPackage.ciphertext
        )
      );


    const payload =
      JSON.parse(
        bytesToText(
          new Uint8Array(
            plaintext
          )
        )
      );


    if (
      payload.format !==
      "origon58-item"
    ) {

      throw new Error(
        "INVALID_ITEM"
      );

    }


    alert(
      "INFORMAÇÃO DESCRIPTOGRAFADA:\n\n" +
      payload.text
    );

  } catch (error) {

    console.error(error);

    alert(
      "Não foi possível descriptografar este dado."
    );

  }

}


/* ==================================================
   SALVAR DADO INDIVIDUAL
================================================== */

async function saveIndividualItem(
  item
) {

  try {

    const blob =
      new Blob(
        [
          JSON.stringify(
            item.itemPackage,
            null,
            2
          )
        ],
        {
          type:
            "application/octet-stream"
        }
      );


    const filename =
      `origon58-item-${item.id}.enc`;


    if (
      "showSaveFilePicker" in window
    ) {

      const handle =
        await window.showSaveFilePicker(
          {
            suggestedName:
              filename,

            types: [

              {
                description:
                  "Arquivo Origon58",

                accept: {
                  "application/octet-stream":
                    [".enc"]
                }
              }

            ]

          }
        );


      const writable =
        await handle.createWritable();

      await writable.write(
        blob
      );

      await writable.close();

    } else {

      const url =
        URL.createObjectURL(
          blob
        );

      const link =
        document.createElement(
          "a"
        );

      link.href =
        url;

      link.download =
        filename;

      document.body.appendChild(
        link
      );

      link.click();

      link.remove();

      URL.revokeObjectURL(
        url
      );

    }


    alert(
      "Arquivo .enc salvo com sucesso! 💾"
    );

  } catch (error) {

    if (
      error &&
      error.name ===
      "AbortError"
    ) {

      return;

    }

    console.error(error);

    alert(
      "Não foi possível salvar o arquivo."
    );

  }

}


/* ==================================================
   EXCLUIR DADO INDIVIDUAL
================================================== */

async function deleteIndividualItem(
  id
) {

  const confirmed =
    confirm(
      "Excluir este dado do cofre?"
    );


  if (!confirmed) {

    return;

  }


  vaultData.items =
    vaultData.items.filter(
      (item) =>
        item.id !== id
    );


  await persistVault();

  renderVault();

}


/* ==================================================
   LIMPAR COFRE
================================================== */

clearVaultButton.addEventListener(
  "click",
  () => {

    clearVaultPassword.value =
      "";

    clearVaultPasswordConfirm.value =
      "";

    clearVaultMessage.textContent =
      "";

    openModal(
      clearVaultModal
    );

  }
);


cancelClearVaultButton.addEventListener(
  "click",
  () => {

    clearVaultPassword.value =
      "";

    clearVaultPasswordConfirm.value =
      "";

    closeModal(
      clearVaultModal
    );

  }
);


confirmClearVaultButton.addEventListener(
  "click",
  async () => {

    const password =
      clearVaultPassword.value;

    const confirmation =
      clearVaultPasswordConfirm.value;


    if (!password) {

      clearVaultMessage.textContent =
        "Crie uma senha para confirmar a limpeza.";

      return;

    }


    if (
      password !==
      confirmation
    ) {

      clearVaultMessage.textContent =
        "As senhas não coincidem.";

      return;

    }


    const confirmed =
      confirm(
        "ATENÇÃO!\n\nTodos os dados do cofre serão apagados.\n\nDeseja continuar?"
      );


    if (!confirmed) {

      return;

    }


    try {

      vaultData = {

        format:
          "Origon58 Vault Data",

        version:
          CONFIG_VERSION,

        items: []

      };


      await persistVault();


      renderVault();


      clearVaultPassword.value =
        "";

      clearVaultPasswordConfirm.value =
        "";


      closeModal(
        clearVaultModal
      );


      alert(
        "Cofre limpo com sucesso."
      );

    } catch (error) {

      console.error(error);

      clearVaultMessage.textContent =
        "Não foi possível limpar o cofre.";

    }

  }
);


/* ==================================================
   LIMPAR TEMPORÁRIOS
================================================== */

clearTemporaryButton.addEventListener(
  "click",
  () => {

    temporaryBackup =
      null;


    backupPassword.value =
      "";

    backupPasswordConfirm.value =
      "";

    decryptPassword.value =
      "";

    backupFile.value =
      "";


    backupMessage.textContent =
      "";

    decryptMessage.textContent =
      "";


    saveBackupButton.classList.add(
      "hidden"
    );


    alert(
      "Dados temporários do backup foram excluídos."
    );

  }
);


/* ==================================================
   BLOQUEAR
================================================== */

function lockVault() {

  sessionKey =
    null;

  vaultData =
    null;

  temporaryBackup =
    null;


  clearMessages();


  showScreen(
    loginScreen
  );


  loginMessage.textContent =
    "";

}


logoutButton.addEventListener(
  "click",
  lockVault
);


lockButton.addEventListener(
  "click",
  lockVault
);


/* ==================================================
   BACKUP GERAL
================================================== */

backupButton.addEventListener(
  "click",
  () => {

    backupPassword.value =
      "";

    backupPasswordConfirm.value =
      "";

    backupMessage.textContent =
      "";

    saveBackupButton.classList.add(
      "hidden"
    );

    temporaryBackup =
      null;

    openModal(
      backupModal
    );

  }
);


cancelBackupButton.addEventListener(
  "click",
  () => {

    temporaryBackup =
      null;

    backupPassword.value =
      "";

    backupPasswordConfirm.value =
      "";

    closeModal(
      backupModal
    );

  }
);


confirmBackupButton.addEventListener(
  "click",
  async () => {

    const password =
      backupPassword.value;

    const confirmation =
      backupPasswordConfirm.value;


    if (!password) {

      backupMessage.textContent =
        "Crie uma senha para o backup.";

      return;

    }


    if (
      password !==
      confirmation
    ) {

      backupMessage.textContent =
        "As senhas não coincidem.";

      return;

    }


    try {

      backupMessage.textContent =
        "Criando backup...";


      const config =
        getConfig();

      const vault =
        getVaultPackage();


      if (
        !config ||
        !vault
      ) {

        throw new Error(
          "BACKUP_DATA_MISSING"
        );

      }


      const backupPayload = {

        format:
          "origon58-backup",

        version:
          BACKUP_VERSION,

        createdAt:
          new Date().toISOString(),

        config,

        vault

      };


      const salt =
        randomBytes(16);


      const key =
        await deriveAESKey(
          password,
          salt
        );


      const encrypted =
        await encryptJSON(
          backupPayload,
          key
        );


      temporaryBackup = {

        format:
          "Origon58 Encrypted Backup",

        version:
          BACKUP_VERSION,

        kdf: {

          name:
            "PBKDF2",

          hash:
            "SHA-256",

          iterations:
            PBKDF2_ITERATIONS,

          salt:
            bytesToBase64(
              salt
            )

        },

        cipher: {

          name:
            "AES-GCM",

          iv:
            encrypted.iv

        },

        ciphertext:
          encrypted.ciphertext

      };


      backupMessage.textContent =
        "Backup criado com sucesso! 💾";


      saveBackupButton.classList.remove(
        "hidden"
      );


      backupPassword.value =
        "";

      backupPasswordConfirm.value =
        "";

    } catch (error) {

      console.error(error);

      backupMessage.textContent =
        "Não foi possível criar o backup.";

    }

  }
);


/* ==================================================
   SALVAR BACKUP
================================================== */

saveBackupButton.addEventListener(
  "click",
  async () => {

    if (!temporaryBackup) {

      backupMessage.textContent =
        "Nenhum backup temporário disponível.";

      return;

    }


    try {

      const blob =
        new Blob(
          [
            JSON.stringify(
              temporaryBackup,
              null,
              2
            )
          ],
          {
            type:
              "application/octet-stream"
          }
        );


      const filename =
        "origon58-backup.enc";


      if (
        "showSaveFilePicker" in window
      ) {

        const handle =
          await window.showSaveFilePicker(
            {
              suggestedName:
                filename,

              types: [

                {
                  description:
                    "Backup Origon58",

                  accept: {
                    "application/octet-stream":
                      [".enc"]
                  }
                }

              ]

            }
          );


        const writable =
          await handle.createWritable();

        await writable.write(
          blob
        );

        await writable.close();

      } else {

        const url =
          URL.createObjectURL(
            blob
          );

        const link =
          document.createElement(
            "a"
          );

        link.href =
          url;

        link.download =
          filename;

        document.body.appendChild(
          link
        );

        link.click();

        link.remove();

        URL.revokeObjectURL(
          url
        );

      }


      alert(
        "Backup salvo com sucesso! 💾\n\nAgora copie o arquivo .enc para o pendrive."
      );

    } catch (error) {

      if (
        error &&
        error.name ===
        "AbortError"
      ) {

        return;

      }

      console.error(error);

      backupMessage.textContent =
        "Não foi possível salvar o backup.";

    }

  }
);


/* ==================================================
   RESTAURAR BACKUP
================================================== */

decryptButton.addEventListener(
  "click",
  () => {

    backupFile.value =
      "";

    decryptPassword.value =
      "";

    decryptMessage.textContent =
      "";

    openModal(
      decryptModal
    );

  }
);


cancelDecryptButton.addEventListener(
  "click",
  () => {

    backupFile.value =
      "";

    decryptPassword.value =
      "";

    closeModal(
      decryptModal
    );

  }
);


confirmDecryptButton.addEventListener(
  "click",
  async () => {

    const file =
      backupFile.files[0];

    const password =
      decryptPassword.value;


    if (!file) {

      decryptMessage.textContent =
        "Selecione um arquivo .enc.";

      return;

    }


    if (
      !file.name.toLowerCase().endsWith(
        ".enc"
      )
    ) {

      decryptMessage.textContent =
        "Selecione um arquivo .enc.";

      return;

    }


    if (!password) {

      decryptMessage.textContent =
        "Digite a senha do backup.";

      return;

    }


    try {

      decryptMessage.textContent =
        "Descriptografando...";


      const text =
        await file.text();


      const packageData =
        JSON.parse(
          text
        );


      if (
        packageData.format !==
        "Origon58 Encrypted Backup"
      ) {

        throw new Error(
          "INVALID_BACKUP_FORMAT"
        );

      }


      if (
        packageData.version !==
        BACKUP_VERSION
      ) {

        throw new Error(
          "INVALID_BACKUP_VERSION"
        );

      }


      const salt =
        base64ToBytes(
          packageData.kdf.salt
        );


      const key =
        await deriveAESKey(
          password,
          salt,
          packageData.kdf.iterations
        );


      const payload =
        await decryptJSON(
          {
            iv:
              packageData.cipher.iv,

            ciphertext:
              packageData.ciphertext

          },
          key
        );


      if (
        payload.format !==
        "origon58-backup"
      ) {

        throw new Error(
          "INVALID_BACKUP_PAYLOAD"
        );

      }


      if (
        !payload.config ||
        !payload.vault
      ) {

        throw new Error(
          "INVALID_BACKUP_STRUCTURE"
        );

      }


      if (
        payload.config.format !==
        "Origon58 Config"
      ) {

        throw new Error(
          "INVALID_CONFIG"
        );

      }


      if (
        payload.vault.format !==
        "Origon58 Vault"
      ) {

        throw new Error(
          "INVALID_VAULT"
        );

      }


      saveConfig(
        payload.config
      );

      saveVaultPackage(
        payload.vault
      );


      sessionKey =
        null;

      vaultData =
        null;

      temporaryBackup =
        null;


      backupFile.value =
        "";

      decryptPassword.value =
        "";


      closeModal(
        decryptModal
      );


      showScreen(
        loginScreen
      );


      loginMessage.textContent =
        "Backup restaurado com sucesso! Informe as três senhas do cofre.";

    } catch (error) {

      console.error(error);

      decryptMessage.textContent =
        "Não foi possível descriptografar este backup.";

    }

  }
);


/* ==================================================
   SERVICE WORKER
================================================== */

if (
  "serviceWorker" in navigator
) {

  window.addEventListener(
    "load",
    () => {

      navigator.serviceWorker
        .register(
          "./sw.js"
        )
        .catch(
          (error) => {

            console.error(
              "Service Worker:",
              error
            );

          }
        );

    }
  );

}


/* ==================================================
   INICIALIZAÇÃO
================================================== */

function initialize() {

  clearMessages();


  const config =
    getConfig();


  if (config) {

    showScreen(
      loginScreen
    );

  } else {

    showScreen(
      setupScreen
    );

  }

}


initialize();
