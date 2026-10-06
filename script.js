"use strict";

/*
  ORIGON58
  Cofre local com:
  - 3 senhas de acesso
  - PBKDF2 + SHA-256
  - AES-GCM
  - cofre criptografado no localStorage
  - dados individuais criptografados
  - arquivos .enc individuais
  - descriptografia de .enc externo
  - funcionamento offline
*/


/* =========================================================
   CONFIGURAÇÕES
========================================================= */

const CONFIG_KEY = "origon58_config_v5";
const VAULT_KEY = "origon58_vault_v5";

const CONFIG_VERSION = 5;
const VAULT_VERSION = 5;
const ITEM_VERSION = 4;

const PBKDF2_ITERATIONS = 250000;


/* =========================================================
   ESTADO TEMPORÁRIO
========================================================= */

let currentVaultKey = null;

let temporarySavedData = "";

let temporarySavedFile = null;


/* =========================================================
   ELEMENTOS AUXILIARES
========================================================= */

function firstElement(ids) {

  for (const id of ids) {

    const element = document.getElementById(id);

    if (element) {
      return element;
    }

  }

  return null;
}


function byId(id) {
  return document.getElementById(id);
}


/* =========================================================
   ELEMENTOS PRINCIPAIS
========================================================= */

const loginScreen =
  firstElement([
    "loginScreen"
  ]);

const setupScreen =
  firstElement([
    "setupScreen"
  ]);

const vaultScreen =
  firstElement([
    "vaultScreen"
  ]);


/* =========================================================
   FUNÇÕES CRIPTOGRÁFICAS
========================================================= */

function bytesToBase64(bytes) {

  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
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


function randomBytes(length) {

  const bytes =
    new Uint8Array(length);

  crypto.getRandomValues(bytes);

  return bytes;
}


async function deriveKey(
  password,
  salt
) {

  const encoder =
    new TextEncoder();

  const passwordBytes =
    encoder.encode(password);

  const baseKey =
    await crypto.subtle.importKey(
      "raw",
      passwordBytes,
      "PBKDF2",
      false,
      [
        "deriveKey"
      ]
    );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations:
        PBKDF2_ITERATIONS,
      hash: "SHA-256"
    },
    baseKey,
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


async function deriveVerifier(
  password,
  salt
) {

  const encoder =
    new TextEncoder();

  const passwordBytes =
    encoder.encode(password);

  const baseKey =
    await crypto.subtle.importKey(
      "raw",
      passwordBytes,
      "PBKDF2",
      false,
      [
        "deriveBits"
      ]
    );

  const bits =
    await crypto.subtle.deriveBits(
      {
        name: "PBKDF2",
        salt,
        iterations:
          PBKDF2_ITERATIONS,
        hash: "SHA-256"
      },
      baseKey,
      256
    );

  return bytesToBase64(
    new Uint8Array(bits)
  );
}


async function encryptText(
  text,
  key
) {

  const encoder =
    new TextEncoder();

  const iv =
    randomBytes(12);

  const plaintext =
    encoder.encode(text);

  const ciphertext =
    await crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv
      },
      key,
      plaintext
    );

  return {
    iv:
      bytesToBase64(iv),

    ciphertext:
      bytesToBase64(
        new Uint8Array(
          ciphertext
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

  const plaintext =
    await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv
      },
      key,
      ciphertext
    );

  const decoder =
    new TextDecoder();

  return decoder.decode(
    plaintext
  );
}


/* =========================================================
   COFRE
========================================================= */

async function createVaultKey(
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

  return deriveKey(
    combined,
    vaultSalt
  );
}


async function encryptVault(
  vault,
  vaultKey
) {

  const json =
    JSON.stringify(vault);

  const encrypted =
    await encryptText(
      json,
      vaultKey
    );

  return {
    format:
      "Origon58 Encrypted Vault",

    version:
      VAULT_VERSION,

    cipher: {
      name:
        "AES-GCM"
    },

    iv:
      encrypted.iv,

    ciphertext:
      encrypted.ciphertext
  };
}


async function decryptVault(
  encryptedVault,
  vaultKey
) {

  if (
    !encryptedVault ||
    encryptedVault.format !==
      "Origon58 Encrypted Vault"
  ) {

    throw new Error(
      "Formato do cofre inválido."
    );

  }

  if (
    encryptedVault.version !==
    VAULT_VERSION
  ) {

    throw new Error(
      "Versão do cofre inválida."
    );

  }

  const json =
    await decryptText(
      encryptedVault,
      vaultKey
    );

  const vault =
    JSON.parse(json);

  if (
    !vault ||
    !Array.isArray(
      vault.items
    )
  ) {

    throw new Error(
      "Estrutura do cofre inválida."
    );

  }

  return vault;
}


async function saveVault(
  vault
) {

  if (!currentVaultKey) {

    throw new Error(
      "Cofre bloqueado."
    );

  }

  const encrypted =
    await encryptVault(
      vault,
      currentVaultKey
    );

  localStorage.setItem(
    VAULT_KEY,
    JSON.stringify(
      encrypted
    )
  );
}


async function loadVault() {

  if (!currentVaultKey) {

    throw new Error(
      "Cofre bloqueado."
    );

  }

  const raw =
    localStorage.getItem(
      VAULT_KEY
    );

  if (!raw) {

    return {
      items: []
    };

  }

  const encrypted =
    JSON.parse(raw);

  return decryptVault(
    encrypted,
    currentVaultKey
  );
}


/* =========================================================
   CONFIGURAÇÃO DAS 3 SENHAS
========================================================= */

async function createAccess(
  password1,
  password2,
  password3
) {

  if (
    !password1 ||
    !password2 ||
    !password3
  ) {

    throw new Error(
      "As três senhas são obrigatórias."
    );

  }

  const vaultSalt =
    randomBytes(16);

  const salt1 =
    randomBytes(16);

  const salt2 =
    randomBytes(16);

  const salt3 =
    randomBytes(16);


  const verifier1 =
    await deriveVerifier(
      password1,
      salt1
    );

  const verifier2 =
    await deriveVerifier(
      password2,
      salt2
    );

  const verifier3 =
    await deriveVerifier(
      password3,
      salt3
    );


  const config = {

    format:
      "Origon58 Config",

    version:
      CONFIG_VERSION,

    kdf: {
      name:
        "PBKDF2",

      hash:
        "SHA-256",

      iterations:
        PBKDF2_ITERATIONS
    },

    vaultSalt:
      bytesToBase64(
        vaultSalt
      ),

    passwords: [

      {
        salt:
          bytesToBase64(
            salt1
          ),

        verifier:
          verifier1
      },

      {
        salt:
          bytesToBase64(
            salt2
          ),

        verifier:
          verifier2
      },

      {
        salt:
          bytesToBase64(
            salt3
          ),

        verifier:
          verifier3
      }

    ]

  };


  localStorage.setItem(
    CONFIG_KEY,
    JSON.stringify(
      config
    )
  );


  const vaultKey =
    await createVaultKey(
      password1,
      password2,
      password3,
      vaultSalt
    );


  currentVaultKey =
    vaultKey;


  await saveVault({
    items: []
  });

}


/* =========================================================
   VERIFICAÇÃO DE ACESSO
========================================================= */

async function verifyPassword(
  password,
  passwordConfig
) {

  const salt =
    base64ToBytes(
      passwordConfig.salt
    );

  const verifier =
    await deriveVerifier(
      password,
      salt
    );

  return (
    verifier ===
    passwordConfig.verifier
  );
}


async function login(
  password1,
  password2,
  password3
) {

  const raw =
    localStorage.getItem(
      CONFIG_KEY
    );

  if (!raw) {

    throw new Error(
      "Acesso ainda não criado."
    );

  }

  const config =
    JSON.parse(raw);


  if (
    config.version !==
    CONFIG_VERSION
  ) {

    throw new Error(
      "Configuração incompatível."
    );

  }


  if (
    !config.passwords ||
    config.passwords.length !== 3
  ) {

    throw new Error(
      "Configuração de acesso inválida."
    );

  }


  const valid1 =
    await verifyPassword(
      password1,
      config.passwords[0]
    );

  const valid2 =
    await verifyPassword(
      password2,
      config.passwords[1]
    );

  const valid3 =
    await verifyPassword(
      password3,
      config.passwords[2]
    );


  if (
    !valid1 ||
    !valid2 ||
    !valid3
  ) {

    return false;

  }


  const vaultSalt =
    base64ToBytes(
      config.vaultSalt
    );


  currentVaultKey =
    await createVaultKey(
      password1,
      password2,
      password3,
      vaultSalt
    );


  await loadVault();

  return true;

}


/* =========================================================
   TELA
========================================================= */

function showScreen(
  screen
) {

  if (loginScreen) {
    loginScreen.style.display =
      "none";
  }

  if (setupScreen) {
    setupScreen.style.display =
      "none";
  }

  if (vaultScreen) {
    vaultScreen.style.display =
      "none";
  }


  if (screen) {
    screen.style.display =
      "block";
  }

}


function showLogin() {
  showScreen(loginScreen);
}


function showSetup() {
  showScreen(setupScreen);
}


function showVault() {
  showScreen(vaultScreen);
}


/* =========================================================
   MENSAGENS
========================================================= */

function setMessage(
  element,
  message
) {

  if (!element) {
    return;
  }

  element.textContent =
    message;

}


function clearMessage(
  element
) {

  if (!element) {
    return;
  }

  element.textContent =
    "";

}


/* =========================================================
   RENDERIZAÇÃO DOS DADOS
========================================================= */

async function renderVault() {

  const list =
    firstElement([
      "dataList",
      "vaultDataList",
      "itemsList"
    ]);

  if (!list) {
    return;
  }


  list.innerHTML =
    "";


  const vault =
    await loadVault();


  if (
    vault.items.length === 0
  ) {

    const empty =
      document.createElement(
        "p"
      );

    empty.textContent =
      "Nenhum dado protegido ainda.";

    list.appendChild(
      empty
    );

    return;

  }


  for (
    const item of vault.items
  ) {

    const card =
      createItemCard(
        item
      );

    list.appendChild(
      card
    );

  }

}


/* =========================================================
   CARD INDIVIDUAL
========================================================= */

function createItemCard(
  item
) {

  const card =
    document.createElement(
      "div"
    );

  card.className =
    "data-card";


  const title =
    document.createElement(
      "h3"
    );

  title.textContent =
    "Dado protegido";


  const status =
    document.createElement(
      "p"
    );

  status.textContent =
    "Conteúdo criptografado";


  const actions =
    document.createElement(
      "div"
    );

  actions.className =
    "data-actions";


  const decryptButton =
    document.createElement(
      "button"
    );

  decryptButton.type =
    "button";

  decryptButton.textContent =
    "🔓 DESCRIPTOGRAFAR";


  const saveButton =
    document.createElement(
      "button"
    );

  saveButton.type =
    "button";

  saveButton.textContent =
    "💾 SALVAR .ENC";


  const deleteButton =
    document.createElement(
      "button"
    );

  deleteButton.type =
    "button";

  deleteButton.textContent =
    "🗑️ EXCLUIR";


  decryptButton.addEventListener(
    "click",
    () => {
      decryptItem(item.id);
    }
  );


  saveButton.addEventListener(
    "click",
    () => {
      saveItemAsFile(item.id);
    }
  );


  deleteButton.addEventListener(
    "click",
    () => {
      deleteItem(item.id);
    }
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


  card.appendChild(
    title
  );

  card.appendChild(
    status
  );

  card.appendChild(
    actions
  );


  return card;

}


/* =========================================================
   ADICIONAR DADO
========================================================= */

function openAddData() {

  const modal =
    firstElement([
      "addDataModal",
      "dataModal"
    ]);

  if (modal) {
    modal.style.display =
      "flex";
  }

}


function closeAddData() {

  const modal =
    firstElement([
      "addDataModal",
      "dataModal"
    ]);

  if (modal) {
    modal.style.display =
      "none";
  }

}


async function encryptNewData() {

  const textInput =
    firstElement([
      "newDataText",
      "dataText",
      "newDataContent"
    ]);

  const passwordInput =
    firstElement([
      "newDataPassword",
      "dataPassword"
    ]);

  const confirmInput =
    firstElement([
      "newDataPasswordConfirm",
      "dataPasswordConfirm"
    ]);


  const text =
    textInput
      ? textInput.value
      : "";

  const password =
    passwordInput
      ? passwordInput.value
      : "";

  const confirmation =
    confirmInput
      ? confirmInput.value
      : "";


  if (!text.trim()) {

    alert(
      "Digite alguma informação."
    );

    return;

  }


  if (!password) {

    alert(
      "Crie uma senha para este dado."
    );

    return;

  }


  if (
    password !==
    confirmation
  ) {

    alert(
      "As senhas não são iguais."
    );

    return;

  }


  const salt =
    randomBytes(16);

  const key =
    await deriveKey(
      password,
      salt
    );


  const encrypted =
    await encryptText(
      text,
      key
    );


  const item = {

    format:
      "Origon58 Secure Item",

    version:
      ITEM_VERSION,

    id:
      crypto.randomUUID(),

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


  const vault =
    await loadVault();


  vault.items.push(
    item
  );


  await saveVault(
    vault
  );


  if (textInput) {
    textInput.value =
      "";
  }

  if (passwordInput) {
    passwordInput.value =
      "";
  }

  if (confirmInput) {
    confirmInput.value =
      "";
  }


  closeAddData();

  await renderVault();


  alert(
    "Dado criptografado com sucesso! 🔐"
  );

}


/* =========================================================
   DESCRIPTOGRAFAR ITEM DO COFRE
========================================================= */

async function decryptItem(
  itemId
) {

  try {

    const vault =
      await loadVault();


    const item =
      vault.items.find(
        (entry) =>
          entry.id ===
          itemId
      );


    if (!item) {

      alert(
        "Dado não encontrado."
      );

      return;

    }


    const password =
      prompt(
        "Digite a senha deste dado:"
      );


    if (
      password === null
    ) {

      return;

    }


    const salt =
      base64ToBytes(
        item.kdf.salt
      );


    const key =
      await deriveKey(
        password,
        salt
      );


    const plaintext =
      await crypto.subtle.decrypt(
        {
          name:
            "AES-GCM",

          iv:
            base64ToBytes(
              item.cipher.iv
            )
        },
        key,
        base64ToBytes(
          item.ciphertext
        )
      );


    const decoder =
      new TextDecoder();


    const text =
      decoder.decode(
        plaintext
      );


    alert(
      "Conteúdo:\n\n" +
      text
    );

  }
  catch (error) {

    alert(
      "Não foi possível descriptografar este dado."
    );

  }

}


/* =========================================================
   SALVAR ITEM COMO .ENC
========================================================= */

async function saveItemAsFile(
  itemId
) {

  try {

    const vault =
      await loadVault();


    const item =
      vault.items.find(
        (entry) =>
          entry.id ===
          itemId
      );


    if (!item) {

      alert(
        "Dado não encontrado."
      );

      return;

    }


    const fileData = {

      format:
        "origon58-item",

      version:
        ITEM_VERSION,

      id:
        item.id,

      createdAt:
        item.createdAt,

      kdf:
        item.kdf,

      cipher:
        item.cipher,

      ciphertext:
        item.ciphertext

    };


    const json =
      JSON.stringify(
        fileData,
        null,
        2
      );


    const blob =
      new Blob(
        [
          json
        ],
        {
          type:
            "application/json"
        }
      );


    const filename =
      "origon58-item-" +
      item.id +
      ".enc";


    if (
      window.showSaveFilePicker
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
                    [
                      ".enc"
                    ]
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

    }
    else {

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

  }
  catch (error) {

    if (
      error &&
      error.name ===
        "AbortError"
    ) {

      return;

    }

    alert(
      "Não foi possível salvar o arquivo .enc."
    );

  }

}


/* =========================================================
   EXCLUIR ITEM
========================================================= */

async function deleteItem(
  itemId
) {

  const confirmed =
    confirm(
      "Excluir somente este dado?"
    );


  if (!confirmed) {
    return;
  }


  const vault =
    await loadVault();


  vault.items =
    vault.items.filter(
      (item) =>
        item.id !==
        itemId
    );


  await saveVault(
    vault
  );


  await renderVault();

}


/* =========================================================
   LIMPAR COFRE
========================================================= */

function openClearVault() {

  const modal =
    firstElement([
      "clearVaultModal"
    ]);

  if (modal) {
    modal.style.display =
      "flex";
  }

}


function closeClearVault() {

  const modal =
    firstElement([
      "clearVaultModal"
    ]);

  if (modal) {
    modal.style.display =
      "none";
  }

}


async function clearVault() {

  const passwordInput =
    firstElement([
      "clearVaultPassword",
      "cleanupPassword"
    ]);

  const confirmationInput =
    firstElement([
      "clearVaultPasswordConfirm",
      "cleanupPasswordConfirm"
    ]);


  const password =
    passwordInput
      ? passwordInput.value
      : "";

  const confirmation =
    confirmationInput
      ? confirmationInput.value
      : "";


  if (!password) {

    alert(
      "Crie uma senha para confirmar a limpeza."
    );

    return;

  }


  if (
    password !==
    confirmation
  ) {

    alert(
      "As senhas não são iguais."
    );

    return;

  }


  const firstConfirmation =
    confirm(
      "ATENÇÃO: todos os dados do cofre serão apagados."
    );


  if (!firstConfirmation) {
    return;
  }


  const secondConfirmation =
    confirm(
      "Tem certeza que deseja apagar o cofre inteiro?"
    );


  if (!secondConfirmation) {
    return;
  }


  localStorage.removeItem(
    VAULT_KEY
  );


  currentVaultKey =
    null;


  if (passwordInput) {
    passwordInput.value =
      "";
  }

  if (confirmationInput) {
    confirmationInput.value =
      "";
  }


  closeClearVault();

  showSetup();


  alert(
    "Cofre limpo. Crie um novo acesso."
  );

}


/* =========================================================
   LIMPAR TEMPORÁRIOS
========================================================= */

function clearTemporaryData() {

  temporarySavedData =
    "";

  temporarySavedFile =
    null;


  const fileInput =
    byId(
      "savedDataFile"
    );

  const passwordInput =
    byId(
      "savedDataPassword"
    );


  if (fileInput) {
    fileInput.value =
      "";
  }


  if (passwordInput) {
    passwordInput.value =
      "";
  }


  const result =
    byId(
      "savedDataResult"
    );

  const resultText =
    byId(
      "savedDataResultText"
    );


  if (result) {
    result.style.display =
      "none";
  }


  if (resultText) {
    resultText.textContent =
      "";
  }


  alert(
    "Dados temporários do backup foram excluídos."
  );

}


/* =========================================================
   DESCRIPTOGRAFAR .ENC EXTERNO
========================================================= */

function openDecryptSaved() {

  const modal =
    byId(
      "decryptSavedModal"
    );

  if (modal) {
    modal.style.display =
      "flex";
  }

}


function closeDecryptSaved() {

  const modal =
    byId(
      "decryptSavedModal"
    );

  if (modal) {
    modal.style.display =
      "none";
  }

}


async function decryptSavedData() {

  const fileInput =
    byId(
      "savedDataFile"
    );

  const passwordInput =
    byId(
      "savedDataPassword"
    );


  if (
    !fileInput ||
    !fileInput.files ||
    !fileInput.files[0]
  ) {

    alert(
      "Selecione um arquivo .enc."
    );

    return;

  }


  const file =
    fileInput.files[0];


  if (
    !file.name
      .toLowerCase()
      .endsWith(".enc")
  ) {

    alert(
      "Selecione um arquivo .enc."
    );

    return;

  }


  const password =
    passwordInput
      ? passwordInput.value
      : "";


  if (!password) {

    alert(
      "Digite a senha deste dado."
    );

    return;

  }


  try {

    const text =
      await file.text();


    const data =
      JSON.parse(
        text
      );


    if (
      data.format !==
        "origon58-item"
    ) {

      throw new Error(
        "Formato inválido."
      );

    }


    if (
      data.version !==
      ITEM_VERSION
    ) {

      throw new Error(
        "Versão inválida."
      );

    }


    if (
      !data.kdf ||
      !data.cipher ||
      !data.ciphertext
    ) {

      throw new Error(
        "Estrutura inválida."
      );

    }


    const salt =
      base64ToBytes(
        data.kdf.salt
      );


    const key =
      await deriveKey(
        password,
        salt
      );


    const plaintext =
      await crypto.subtle.decrypt(
        {
          name:
            "AES-GCM",

          iv:
            base64ToBytes(
              data.cipher.iv
            )
        },
        key,
        base64ToBytes(
          data.ciphertext
        )
      );


    const decoder =
      new TextDecoder();


    const decrypted =
      decoder.decode(
        plaintext
      );


    temporarySavedData =
      decrypted;

    temporarySavedFile =
      file;


    const result =
      byId(
        "savedDataResult"
      );

    const resultText =
      byId(
        "savedDataResultText"
      );


    if (resultText) {

      resultText.textContent =
        decrypted;

    }


    if (result) {

      result.style.display =
        "block";

    }


  }
  catch (error) {

    temporarySavedData =
      "";

    alert(
      "Não foi possível descriptografar este arquivo."
    );

  }

}


/* =========================================================
   SAIR DO COFRE
========================================================= */

function logout() {

  currentVaultKey =
    null;


  temporarySavedData =
    "";

  temporarySavedFile =
    null;


  showLogin();

}


/* =========================================================
   EVENTOS
========================================================= */

function setupEvents() {


  /* ---------- SETUP ---------- */

  const setupForm =
    firstElement([
      "setupForm"
    ]);


  if (setupForm) {

    setupForm.addEventListener(
      "submit",
      async (event) => {

        event.preventDefault();


        const password1 =
          firstElement([
            "setupPassword1",
            "password1"
          ]);

        const password2 =
          firstElement([
            "setupPassword2",
            "password2"
          ]);

        const password3 =
          firstElement([
            "setupPassword3",
            "password3"
          ]);


        const message =
          firstElement([
            "setupMessage",
            "setupResult",
            "setupError"
          ]);


        try {

          if (message) {
            message.textContent =
              "Criando acesso...";
          }


          await createAccess(
            password1
              ? password1.value
              : "",

            password2
              ? password2.value
              : "",

            password3
              ? password3.value
              : ""
          );


          if (password1) {
            password1.value =
              "";
          }

          if (password2) {
            password2.value =
              "";
          }

          if (password3) {
            password3.value =
              "";
          }


          clearMessage(
            message
          );


          showVault();

          await renderVault();

        }
        catch (error) {

          console.error(
            "Origon58 setup error:",
            error
          );


          setMessage(
            message,
            "Não foi possível criar o acesso."
          );

        }

      }
    );

  }


  /* ---------- LOGIN ---------- */

  const loginForm =
    firstElement([
      "loginForm"
    ]);


  if (loginForm) {

    loginForm.addEventListener(
      "submit",
      async (event) => {

        event.preventDefault();


        const password1 =
          firstElement([
            "loginPassword1",
            "loginPassword_1"
          ]);

        const password2 =
          firstElement([
            "loginPassword2",
            "loginPassword_2"
          ]);

        const password3 =
          firstElement([
            "loginPassword3",
            "loginPassword_3"
          ]);


        const message =
          firstElement([
            "loginMessage",
            "loginResult",
            "loginError"
          ]);


        try {

          const success =
            await login(
              password1
                ? password1.value
                : "",

              password2
                ? password2.value
                : "",

              password3
                ? password3.value
                : ""
            );


          if (!success) {

            currentVaultKey =
              null;


            setMessage(
              message,
              "por que quer entrar aqui 🤨"
            );

            return;

          }


          clearMessage(
            message
          );


          showVault();

          await renderVault();

        }
        catch (error) {

          console.error(
            "Origon58 login error:",
            error
          );


          currentVaultKey =
            null;


          setMessage(
            message,
            "por que quer entrar aqui 🤨"
          );

        }

      }
    );

  }


  /* ---------- ADICIONAR ---------- */

  const addButton =
    firstElement([
      "addDataButton",
      "openAddDataButton"
    ]);


  if (addButton) {

    addButton.addEventListener(
      "click",
      openAddData
    );

  }


  const encryptButton =
    firstElement([
      "encryptDataButton",
      "confirmAddDataButton"
    ]);


  if (encryptButton) {

    encryptButton.addEventListener(
      "click",
      async () => {

        try {

          await encryptNewData();

        }
        catch (error) {

          console.error(
            error
          );

          alert(
            "Não foi possível criptografar o dado."
          );

        }

      }
    );

  }


  const cancelAddButton =
    firstElement([
      "cancelAddDataButton",
      "closeAddDataButton"
    ]);


  if (cancelAddButton) {

    cancelAddButton.addEventListener(
      "click",
      closeAddData
    );

  }


  /* ---------- LIMPAR COFRE ---------- */

  const clearVaultButton =
    byId(
      "clearVaultButton"
    );


  if (clearVaultButton) {

    clearVaultButton.addEventListener(
      "click",
      openClearVault
    );

  }


  const confirmClearVaultButton =
    firstElement([
      "confirmClearVaultButton",
      "confirmClearVault"
    ]);


  if (confirmClearVaultButton) {

    confirmClearVaultButton.addEventListener(
      "click",
      async () => {

        try {

          await clearVault();

        }
        catch (error) {

          console.error(
            error
          );

          alert(
            "Não foi possível limpar o cofre."
          );

        }

      }
    );

  }


  const cancelClearVaultButton =
    firstElement([
      "cancelClearVaultButton",
      "closeClearVaultButton"
    ]);


  if (cancelClearVaultButton) {

    cancelClearVaultButton.addEventListener(
      "click",
      closeClearVault
    );

  }


  /* ---------- TEMPORÁRIOS ---------- */

  const clearTemporaryButton =
    byId(
      "clearTemporaryButton"
    );


  if (clearTemporaryButton) {

    clearTemporaryButton.addEventListener(
      "click",
      clearTemporaryData
    );

  }


  /* ---------- DESCRIPTOGRAFAR SALVO ---------- */

  const decryptSavedButton =
    byId(
      "decryptSavedButton"
    );


  if (decryptSavedButton) {

    decryptSavedButton.addEventListener(
      "click",
      openDecryptSaved
    );

  }


  const confirmDecryptSavedButton =
    byId(
      "confirmDecryptSavedButton"
    );


  if (
    confirmDecryptSavedButton
  ) {

    confirmDecryptSavedButton.addEventListener(
      "click",
      async () => {

        try {

          await decryptSavedData();

        }
        catch (error) {

          console.error(
            error
          );

          alert(
            "Não foi possível descriptografar este arquivo."
          );

        }

      }
    );

  }


  const cancelDecryptSavedButton =
    firstElement([
      "cancelDecryptSavedButton",
      "closeDecryptSavedButton"
    ]);


  if (
    cancelDecryptSavedButton
  ) {

    cancelDecryptSavedButton.addEventListener(
      "click",
      closeDecryptSaved
    );

  }


  /* ---------- LOGOUT ---------- */

  const logoutButton =
    byId(
      "logoutButton"
    );


  if (logoutButton) {

    logoutButton.addEventListener(
      "click",
      logout
    );

  }

}


/* =========================================================
   INICIALIZAÇÃO
========================================================= */

async function initialize() {

  setupEvents();


  const existingConfig =
    localStorage.getItem(
      CONFIG_KEY
    );


  if (existingConfig) {

    showLogin();

  }
  else {

    showSetup();

  }


  /* ---------- SERVICE WORKER ---------- */

  if (
    "serviceWorker" in navigator
  ) {

    try {

      const registration =
        await navigator.serviceWorker.register(
          "./sw.js"
        );


      if (
        registration.waiting
      ) {

        registration.waiting.postMessage(
          {
            type:
              "SKIP_WAITING"
          }
        );

      }


      navigator.serviceWorker.addEventListener(
        "message",
        (event) => {

          if (
            event.data &&
            event.data.type ===
              "ORIGON58_SW_UPDATED"
          ) {

            console.log(
              "Origon58 Service Worker atualizado:",
              event.data.version
            );

          }

        }
      );

    }
    catch (error) {

      console.error(
        "Erro no Service Worker:",
        error
      );

    }

  }

}


document.addEventListener(
  "DOMContentLoaded",
  initialize
);
