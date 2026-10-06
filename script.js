"use strict";


/* =========================================================
   ORIGON58
   Cofre pessoal criptografado
   ========================================================= */


/* =========================================================
   CONFIGURAÇÕES
   ========================================================= */

const CONFIG_KEY =
  "origon58_config_v3";

const VAULT_KEY =
  "origon58_vault_v3";

const CONFIG_VERSION =
  3;

const ITEM_VERSION =
  3;

const BACKUP_VERSION =
  3;

const PBKDF2_ITERATIONS =
  250000;


/* =========================================================
   ESTADO TEMPORÁRIO
   ========================================================= */

let sessionKey = null;

let vaultData = null;

let temporaryBackup = null;

let temporaryItemPackages = new Map();


/* =========================================================
   ELEMENTOS
   ========================================================= */

const setupScreen =
  document.getElementById(
    "setupScreen"
  );

const loginScreen =
  document.getElementById(
    "loginScreen"
  );

const vaultScreen =
  document.getElementById(
    "vaultScreen"
  );


const setupForm =
  document.getElementById(
    "setupForm"
  );

const loginForm =
  document.getElementById(
    "loginForm"
  );


const setupMessage =
  document.getElementById(
    "setupMessage"
  );

const loginMessage =
  document.getElementById(
    "loginMessage"
  );


const addDataButton =
  document.getElementById(
    "addDataButton"
  );

const dataList =
  document.getElementById(
    "dataList"
  );

const dataCount =
  document.getElementById(
    "dataCount"
  );


const lockButton =
  document.getElementById(
    "lockButton"
  );

const logoutButton =
  document.getElementById(
    "logoutButton"
  );


const clearVaultButton =
  document.getElementById(
    "clearVaultButton"
  );

const clearTemporaryButton =
  document.getElementById(
    "clearTemporaryButton"
  );


const backupButton =
  document.getElementById(
    "backupButton"
  );

const decryptButton =
  document.getElementById(
    "decryptButton"
  );


/* =========================================================
   MODAL — ADICIONAR DADO
   ========================================================= */

const addDataModal =
  document.getElementById(
    "addDataModal"
  );

const newDataText =
  document.getElementById(
    "newDataText"
  );

const newDataPassword =
  document.getElementById(
    "newDataPassword"
  );

const newDataPasswordConfirm =
  document.getElementById(
    "newDataPasswordConfirm"
  );

const encryptDataButton =
  document.getElementById(
    "encryptDataButton"
  );

const cancelAddDataButton =
  document.getElementById(
    "cancelAddDataButton"
  );

const addDataMessage =
  document.getElementById(
    "addDataMessage"
  );


/* =========================================================
   MODAL — LIMPAR COFRE
   ========================================================= */

const clearVaultModal =
  document.getElementById(
    "clearVaultModal"
  );

const clearVaultPassword =
  document.getElementById(
    "clearVaultPassword"
  );

const clearVaultPasswordConfirm =
  document.getElementById(
    "clearVaultPasswordConfirm"
  );

const confirmClearVaultButton =
  document.getElementById(
    "confirmClearVaultButton"
  );

const cancelClearVaultButton =
  document.getElementById(
    "cancelClearVaultButton"
  );

const clearVaultMessage =
  document.getElementById(
    "clearVaultMessage"
  );


/* =========================================================
   MODAL — BACKUP
   ========================================================= */

const backupModal =
  document.getElementById(
    "backupModal"
  );

const backupPassword =
  document.getElementById(
    "backupPassword"
  );

const backupPasswordConfirm =
  document.getElementById(
    "backupPasswordConfirm"
  );

const confirmBackupButton =
  document.getElementById(
    "confirmBackupButton"
  );

const cancelBackupButton =
  document.getElementById(
    "cancelBackupButton"
  );

const saveBackupButton =
  document.getElementById(
    "saveBackupButton"
  );

const backupMessage =
  document.getElementById(
    "backupMessage"
  );


/* =========================================================
   MODAL — RESTAURAR BACKUP
   ========================================================= */

const decryptModal =
  document.getElementById(
    "decryptModal"
  );

const backupFile =
  document.getElementById(
    "backupFile"
  );

const decryptPassword =
  document.getElementById(
    "decryptPassword"
  );

const confirmDecryptButton =
  document.getElementById(
    "confirmDecryptButton"
  );

const cancelDecryptButton =
  document.getElementById(
    "cancelDecryptButton"
  );

const decryptMessage =
  document.getElementById(
    "decryptMessage"
  );


/* =========================================================
   UTILITÁRIOS
   ========================================================= */

function randomBytes(length) {

  const bytes =
    new Uint8Array(
      length
    );

  crypto.getRandomValues(
    bytes
  );

  return bytes;

}


function bytesToBase64(bytes) {

  let binary = "";

  const chunkSize =
    0x8000;

  for (
    let i = 0;
    i < bytes.length;
    i += chunkSize
  ) {

    const chunk =
      bytes.subarray(
        i,
        Math.min(
          i + chunkSize,
          bytes.length
        )
      );

    binary += String.fromCharCode(
      ...chunk
    );

  }

  return btoa(
    binary
  );

}


function base64ToBytes(base64) {

  if (
    typeof base64 !==
    "string"
  ) {

    throw new Error(
      "Base64 inválido."
    );

  }


  const clean =
    base64
      .replace(
       (/\s/g),
        ""
      );


  if (
    clean.length === 0
  ) {

    throw new Error(
      "Base64 vazio."
    );

  }


  const binary =
    atob(
      clean
    );


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
      binary.charCodeAt(
        i
      );

  }

  return bytes;

}


function uint8ToArrayBuffer(
  bytes
) {

  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset +
      bytes.byteLength
  );

}


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


function clearMessage(
  element
) {

  element.textContent =
    "";

}


function safeString(
  value
) {

  if (
    typeof value !==
    "string"
  ) {

    return "";

  }

  return value;

}


/* =========================================================
   CRIPTOGRAFIA
   ========================================================= */

async function deriveAESKey(
  password,
  salt,
  iterations = PBKDF2_ITERATIONS
) {

  if (
    typeof password !==
    "string" ||
    password.length === 0
  ) {

    throw new Error(
      "Senha vazia."
    );

  }


  const passwordBytes =
    new TextEncoder().encode(
      password
    );


  const keyMaterial =
    await crypto.subtle.importKey(
      "raw",
      passwordBytes,
      {
        name: "PBKDF2"
      },
      false,
      [
        "deriveKey"
      ]
    );


  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: iterations,
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


async function encryptText(
  text,
  key
) {

  const iv =
    randomBytes(
      12
    );


  const plaintext =
    new TextEncoder().encode(
      text
    );


  const encrypted =
    await crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv: iv
      },
      key,
      plaintext
    );


  return {

    iv:
      bytesToBase64(
        iv
      ),

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

  if (
    !packageData ||
    typeof packageData.iv !==
      "string" ||
    typeof packageData.ciphertext !==
      "string"
  ) {

    throw new Error(
      "Pacote criptográfico inválido."
    );

  }


  const iv =
    base64ToBytes(
      packageData.iv
    );


  const ciphertext =
    base64ToBytes(
      packageData.ciphertext
    );


  if (
    iv.length !== 12
  ) {

    throw new Error(
      "IV inválido."
    );

  }


  const decrypted =
    await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: iv
      },
      key,
      ciphertext
    );


  return new TextDecoder()
    .decode(
      decrypted
    );

}


async function encryptJSON(
  value,
  key
) {

  return encryptText(
    JSON.stringify(
      value
    ),
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


/* =========================================================
   CONFIGURAÇÃO DO COFRE
   ========================================================= */

function createConfigPackage(
  passwordHashes
) {

  return {

    format:
      "Origon58 Config",

    version:
      CONFIG_VERSION,

    passwordVerifiers:
      passwordHashes

  };

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

    return JSON.parse(
      raw
    );

  } catch {

    return null;

  }

}


function saveConfig(
  config
) {

  localStorage.setItem(
    CONFIG_KEY,
    JSON.stringify(
      config
    )
  );

}


/* =========================================================
   VERIFICADOR DE SENHAS
   ========================================================= */

async function createPasswordVerifier(
  password
) {

  const salt =
    randomBytes(
      16
    );


  const key =
    await deriveAESKey(
      password,
      salt
    );


  const testPackage =
    await encryptText(
      "origon58-password-test",
      key
    );


  return {

    salt:
      bytesToBase64(
        salt
      ),

    iv:
      testPackage.iv,

    ciphertext:
      testPackage.ciphertext,

    iterations:
      PBKDF2_ITERATIONS

  };

}


async function verifyPassword(
  password,
  verifier
) {

  try {

    const salt =
      base64ToBytes(
        verifier.salt
      );


    const key =
      await deriveAESKey(
        password,
        salt,
        verifier.iterations
      );


    const text =
      await decryptText(
        {
          iv:
            verifier.iv,

          ciphertext:
            verifier.ciphertext

        },
        key
      );


    return (
      text ===
      "origon58-password-test"
    );

  } catch {

    return false;

  }

}


/* =========================================================
   COFRE
   ========================================================= */

function createEmptyVault() {

  return {

    format:
      "Origon58 Vault",

    version:
      3,

    items:
      []

  };

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

    return JSON.parse(
      raw
    );

  } catch {

    return null;

  }

}


async function saveVaultPackage(
  vaultPackage
) {

  if (!sessionKey) {

    throw new Error(
      "Cofre bloqueado."
    );

  }


  const encrypted =
    await encryptJSON(
      vaultPackage,
      sessionKey
    );


  const packageToSave = {

    format:
      "Origon58 Encrypted Vault",

    version:
      3,

    cipher:
      encrypted

  };


  localStorage.setItem(
    VAULT_KEY,
    JSON.stringify(
      packageToSave
    )
  );

}


async function loadVault() {

  const packageData =
    getVaultPackage();


  if (!packageData) {

    vaultData =
      createEmptyVault();

    await saveVaultPackage(
      vaultData
    );

    return;

  }


  if (
    packageData.format !==
    "Origon58 Encrypted Vault"
  ) {

    throw new Error(
      "Formato do cofre inválido."
    );

  }


  vaultData =
    await decryptJSON(
      packageData.cipher,
      sessionKey
    );


  if (
    !vaultData ||
    vaultData.format !==
      "Origon58 Vault" ||
    !Array.isArray(
      vaultData.items
    )
  ) {

    throw new Error(
      "Estrutura do cofre inválida."
    );

  }

}


/* =========================================================
   CRIAÇÃO DO ACESSO
   ========================================================= */

setupForm.addEventListener(
  "submit",
  async (event) => {

    event.preventDefault();

    clearMessage(
      setupMessage
    );


    const password1 =
      document.getElementById(
        "setupPassword1"
      ).value;

    const password1Confirm =
      document.getElementById(
        "setupPassword1Confirm"
      ).value;


    const password2 =
      document.getElementById(
        "setupPassword2"
      ).value;

    const password2Confirm =
      document.getElementById(
        "setupPassword2Confirm"
      ).value;


    const password3 =
      document.getElementById(
        "setupPassword3"
      ).value;

    const password3Confirm =
      document.getElementById(
        "setupPassword3Confirm"
      ).value;


    if (
      !password1 ||
      !password2 ||
      !password3
    ) {

      setupMessage.textContent =
        "Preencha as três senhas.";

      return;

    }


    if (
      password1 !==
      password1Confirm
    ) {

      setupMessage.textContent =
        "A primeira senha não confere.";

      return;

    }


    if (
      password2 !==
      password2Confirm
    ) {

      setupMessage.textContent =
        "A segunda senha não confere.";

      return;

    }


    if (
      password3 !==
      password3Confirm
    ) {

      setupMessage.textContent =
        "A terceira senha não confere.";

      return;

    }


    if (
      password1.length < 4 ||
      password2.length < 4 ||
      password3.length < 4
    ) {

      setupMessage.textContent =
        "Use senhas com pelo menos 4 caracteres.";

      return;

    }


    try {

      const verifiers =
        await Promise.all([

          createPasswordVerifier(
            password1
          ),

          createPasswordVerifier(
            password2
          ),

          createPasswordVerifier(
            password3
          )

        ]);


      const config =
        createConfigPackage(
          verifiers
        );


      saveConfig(
        config
      );


      const accessMaterial =
        password1 +
        "\u0000" +
        password2 +
        "\u0000" +
        password3;


      const accessSalt =
        new TextEncoder().encode(
          "origon58-access-salt-v3"
        );


      sessionKey =
        await deriveAESKey(
          accessMaterial,
          accessSalt
        );


      vaultData =
        createEmptyVault();


      await saveVaultPackage(
        vaultData
      );


      setupForm.reset();

      showScreen(
        loginScreen
      );


      loginMessage.textContent =
        "Acesso criado. Informe as três senhas.";

    } catch (
      error
    ) {

      console.error(
        error
      );

      setupMessage.textContent =
        "Não foi possível criar o acesso.";

    }

  }
);


/* =========================================================
   LOGIN
   ========================================================= */

loginForm.addEventListener(
  "submit",
  async (event) => {

    event.preventDefault();

    clearMessage(
      loginMessage
    );


    const password1 =
      document.getElementById(
        "loginPassword1"
      ).value;

    const password2 =
      document.getElementById(
        "loginPassword2"
      ).value;

    const password3 =
      document.getElementById(
        "loginPassword3"
      ).value;


    const config =
      getConfig();


    if (
      !config ||
      !Array.isArray(
        config.passwordVerifiers
      ) ||
      config.passwordVerifiers.length !==
        3
    ) {

      showScreen(
        setupScreen
      );

      return;

    }


    try {

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

        loginMessage.textContent =
          "por que quer entrar aqui 🤨";

        return;

      }


      const accessMaterial =
        password1 +
        "\u0000" +
        password2 +
        "\u0000" +
        password3;


      const accessSalt =
        new TextEncoder().encode(
          "origon58-access-salt-v3"
        );


      sessionKey =
        await deriveAESKey(
          accessMaterial,
          accessSalt
        );


      await loadVault();


      loginForm.reset();

      showScreen(
        vaultScreen
      );

      renderVault();

    } catch (
      error
    ) {

      console.error(
        error
      );

      sessionKey =
        null;

      vaultData =
        null;

      loginMessage.textContent =
        "por que quer entrar aqui 🤨";

    }

  }
);


/* =========================================================
   RENDERIZAÇÃO
   ========================================================= */

function renderVault() {

  dataList.innerHTML =
    "";


  if (
    !vaultData ||
    !Array.isArray(
      vaultData.items
    )
  ) {

    dataCount.textContent =
      "0";

    return;

  }


  dataCount.textContent =
    String(
      vaultData.items.length
    );


  if (
    vaultData.items.length ===
    0
  ) {

    const empty =
      document.createElement(
        "p"
      );

    empty.className =
      "panel-description";

    empty.textContent =
      "Nenhum dado protegido ainda.";

    dataList.appendChild(
      empty
    );

    return;

  }


  vaultData.items.forEach(
    (item) => {

      const card =
        document.createElement(
          "article"
        );

      card.className =
        "data-card";


      const title =
        document.createElement(
          "h3"
        );

      title.textContent =
        item.title ||
        "Dado protegido";


      const text =
        document.createElement(
          "pre"
        );

      text.className =
        "ciphertext";

      text.textContent =
        item.ciphertext ||
        "";


      const actions =
        document.createElement(
          "div"
        );

      actions.className =
        "data-actions";


      const decryptButtonItem =
        document.createElement(
          "button"
        );

      decryptButtonItem.type =
        "button";

      decryptButtonItem.className =
        "secondary-button";

      decryptButtonItem.textContent =
        "🔓 DESCRIPTOGRAFAR";


      decryptButtonItem.addEventListener(
        "click",
        () => {

          decryptIndividualItem(
            item
          );

        }
      );


      const saveButton =
        document.createElement(
          "button"
        );

      saveButton.type =
        "button";

      saveButton.className =
        "secondary-button";

      saveButton.textContent =
        "💾 SALVAR .ENC";


      saveButton.addEventListener(
        "click",
        () => {

          saveIndividualItem(
            item
          );

        }
      );


      const deleteButton =
        document.createElement(
          "button"
        );

      deleteButton.type =
        "button";

      deleteButton.className =
        "danger-button";

      deleteButton.textContent =
        "🗑️ EXCLUIR";


      deleteButton.addEventListener(
        "click",
        async () => {

          const confirmed =
            confirm(
              "Excluir este dado?"
            );


          if (!confirmed) {

            return;

          }


          vaultData.items =
            vaultData.items.filter(
              (entry) =>
                entry.id !==
                item.id
            );


          await saveVaultPackage(
            vaultData
          );


          renderVault();

        }
      );


      actions.appendChild(
        decryptButtonItem
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


/* =========================================================
   ADICIONAR DADO
   ========================================================= */

addDataButton.addEventListener(
  "click",
  () => {

    newDataText.value =
      "";

    newDataPassword.value =
      "";

    newDataPasswordConfirm.value =
      "";

    clearMessage(
      addDataMessage
    );

    openModal(
      addDataModal
    );

    newDataText.focus();

  }
);


cancelAddDataButton.addEventListener(
  "click",
  () => {

    closeModal(
      addDataModal
    );

  }
);


encryptDataButton.addEventListener(
  "click",
  async () => {

    clearMessage(
      addDataMessage
    );


    const text =
      newDataText.value;

    const password =
      newDataPassword.value;

    const confirmation =
      newDataPasswordConfirm.value;


    if (
      !text.trim()
    ) {

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
        "As senhas não conferem.";

      return;

    }


    try {

      const id =
        crypto.randomUUID();


      const salt =
        randomBytes(
          16
        );


      const key =
        await deriveAESKey(
          password,
          salt
        );


      const payload = {

        format:
          "origon58-item",

        version:
          ITEM_VERSION,

        id:
          id,

        createdAt:
          new Date().toISOString(),

        text:
          text

      };


      const encrypted =
        await encryptJSON(
          payload,
          key
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


      const item = {

        id:
          id,

        title:
          `Dado ${
            vaultData.items.length + 1
          }`,

        createdAt:
          payload.createdAt,

        ciphertext:
          encrypted.ciphertext,

        itemPackage:
          itemPackage

      };


      vaultData.items.push(
        item
      );


      await saveVaultPackage(
        vaultData
      );


      closeModal(
        addDataModal
      );


      renderVault();

    } catch (
      error
    ) {

      console.error(
        error
      );

      addDataMessage.textContent =
        "Não foi possível criptografar este dado.";

    }

  }
);


/* =========================================================
   DESCRIPTOGRAFAR DADO INDIVIDUAL
   ========================================================= */

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


  try {

    const packageData =
      item.itemPackage;


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
      "origon58-item"
    ) {

      throw new Error(
        "Item inválido."
      );

    }


    alert(
      payload.text
    );

  } catch (
    error
  ) {

    console.error(
      error
    );

    alert(
      "Senha incorreta ou dado inválido."
    );

  }

}


/* =========================================================
   SALVAR ITEM INDIVIDUAL
   ========================================================= */

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
      "origon58-item.enc";


    if (
      "showSaveFilePicker" in
      window
    ) {

      const handle =
        await window.showSaveFilePicker(
          {

            suggestedName:
              filename,

            types: [

              {

                description:
                  "Item Origon58",

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


      setTimeout(
        () => {

          URL.revokeObjectURL(
            url
          );

        },
        1000
      );

    }


    alert(
      "Arquivo .enc salvo com sucesso!"
    );

  } catch (
    error
  ) {

    if (
      error &&
      error.name ===
        "AbortError"
    ) {

      return;

    }


    console.error(
      error
    );


    alert(
      "Não foi possível salvar o arquivo."
    );

  }

}


/* =========================================================
   LIMPAR COFRE
   ========================================================= */

clearVaultButton.addEventListener(
  "click",
  () => {

    clearVaultPassword.value =
      "";

    clearVaultPasswordConfirm.value =
      "";

    clearMessage(
      clearVaultMessage
    );

    openModal(
      clearVaultModal
    );

  }
);


cancelClearVaultButton.addEventListener(
  "click",
  () => {

    closeModal(
      clearVaultModal
    );

  }
);


confirmClearVaultButton.addEventListener(
  "click",
  async () => {

    clearMessage(
      clearVaultMessage
    );


    const password =
      clearVaultPassword.value;

    const confirmation =
      clearVaultPasswordConfirm.value;


    if (!password) {

      clearVaultMessage.textContent =
        "Crie uma senha para autorizar a limpeza.";

      return;

    }


    if (
      password !==
      confirmation
    ) {

      clearVaultMessage.textContent =
        "As senhas não conferem.";

      return;

    }


    const confirmed =
      confirm(
        "ATENÇÃO: todos os dados do cofre serão apagados. Continuar?"
      );


    if (!confirmed) {

      return;

    }


    vaultData =
      createEmptyVault();


    await saveVaultPackage(
      vaultData
    );


    closeModal(
      clearVaultModal
    );


    renderVault();


    alert(
      "Cofre limpo com sucesso."
    );

  }
);


/* =========================================================
   LIMPAR TEMPORÁRIOS
   ========================================================= */

clearTemporaryButton.addEventListener(
  "click",
  () => {

    temporaryBackup =
      null;

    temporaryItemPackages.clear();


    backupPassword.value =
      "";

    backupPasswordConfirm.value =
      "";

    decryptPassword.value =
      "";

    backupFile.value =
      "";


    saveBackupButton.classList.add(
      "hidden"
    );


    alert(
      "Dados temporários do backup foram excluídos."
    );

  }
);


/* =========================================================
   VOLTAR PARA A SENHA
   ========================================================= */

lockButton.addEventListener(
  "click",
  () => {

    logoutToLogin();

  }
);


logoutButton.addEventListener(
  "click",
  () => {

    logoutToLogin();

  }
);


function logoutToLogin() {

  sessionKey =
    null;

  vaultData =
    null;

  temporaryBackup =
    null;

  temporaryItemPackages.clear();


  closeModal(
    addDataModal
  );

  closeModal(
    clearVaultModal
  );

  closeModal(
    backupModal
  );

  closeModal(
    decryptModal
  );


  loginForm.reset();

  showScreen(
    loginScreen
  );

  loginMessage.textContent =
    "";

}


/* =========================================================
   BACKUP GERAL
   ========================================================= */

backupButton.addEventListener(
  "click",
  () => {

    backupPassword.value =
      "";

    backupPasswordConfirm.value =
      "";

    clearMessage(
      backupMessage
    );


    temporaryBackup =
      null;


    saveBackupButton.classList.add(
      "hidden"
    );


    openModal(
      backupModal
    );

  }
);


cancelBackupButton.addEventListener(
  "click",
  () => {

    closeModal(
      backupModal
    );

  }
);


/* =========================================================
   CRIAR BACKUP
   ========================================================= */

confirmBackupButton.addEventListener(
  "click",
  async () => {

    clearMessage(
      backupMessage
    );


    const password =
      backupPassword.value;

    const confirmation =
      backupPasswordConfirm.value;


    if (!password) {

      backupMessage.textContent =
        "Crie uma senha para este backup.";

      return;

    }


    if (
      password !==
      confirmation
    ) {

      backupMessage.textContent =
        "As senhas não conferem.";

      return;

    }


    if (
      !vaultData ||
      !sessionKey
    ) {

      backupMessage.textContent =
        "O cofre não está disponível.";

      return;

    }


    try {

      /*
       * O backup guarda o pacote criptografado
       * do cofre dentro de uma segunda camada.
       *
       * A senha do backup protege esta camada.
       */

      const currentVaultPackage =
        getVaultPackage();


      const currentConfig =
        getConfig();


      if (
        !currentVaultPackage ||
        !currentConfig
      ) {

        throw new Error(
          "Dados do cofre não encontrados."
        );

      }


      const backupPayload = {

        format:
          "origon58-backup",

        version:
          BACKUP_VERSION,

        createdAt:
          new Date().toISOString(),

        config:
          currentConfig,

        vault:
          currentVaultPackage

      };


      const salt =
        randomBytes(
          16
        );


      const key =
        await deriveAESKey(
          password,
          salt,
          PBKDF2_ITERATIONS
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

        createdAt:
          backupPayload.createdAt,

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


      saveBackupButton.classList.remove(
        "hidden"
      );


      backupMessage.textContent =
        "Backup criado com sucesso! 💾";

    } catch (
      error
    ) {

      console.error(
        error
      );


      temporaryBackup =
        null;


      backupMessage.textContent =
        "Não foi possível criar o backup.";

    }

  }
);


/* =========================================================
   SALVAR BACKUP
   ========================================================= */

saveBackupButton.addEventListener(
  "click",
  async () => {

    if (
      !temporaryBackup
    ) {

      backupMessage.textContent =
        "Crie o backup primeiro.";

      return;

    }


    try {

      const json =
        JSON.stringify(
          temporaryBackup,
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
              "application/octet-stream"
          }
        );


      const filename =
        "origon58-backup.enc";


      if (
        "showSaveFilePicker" in
        window
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


        setTimeout(
          () => {

            URL.revokeObjectURL(
              url
            );

          },
          1000
        );

      }


      backupMessage.textContent =
        "Arquivo .enc salvo com sucesso!";

    } catch (
      error
    ) {

      if (
        error &&
        error.name ===
          "AbortError"
      ) {

        return;

      }


      console.error(
        error
      );


      backupMessage.textContent =
        "Não foi possível salvar o arquivo.";

    }

  }
);


/* =========================================================
   RESTAURAR BACKUP
   ========================================================= */

decryptButton.addEventListener(
  "click",
  () => {

    backupFile.value =
      "";

    decryptPassword.value =
      "";

    clearMessage(
      decryptMessage
    );


    openModal(
      decryptModal
    );

  }
);


cancelDecryptButton.addEventListener(
  "click",
  () => {

    closeModal(
      decryptModal
    );

  }
);


/* =========================================================
   DESCRIPTOGRAFAR BACKUP
   ========================================================= */

confirmDecryptButton.addEventListener(
  "click",
  async () => {

    clearMessage(
      decryptMessage
    );


    const file =
      backupFile.files[0];

    const password =
      decryptPassword.value;


    if (!file) {

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

      /*
       * ETAPA 1
       * Ler arquivo como texto.
       */

      const text =
        await file.text();


      if (
        !text ||
        !text.trim()
      ) {

        throw new Error(
          "Arquivo vazio."
        );

      }


      /*
       * ETAPA 2
       * Converter JSON.
       */

      let packageData;


      try {

        packageData =
          JSON.parse(
            text.trim()
          );

      } catch {

        throw new Error(
          "O arquivo não contém JSON válido."
        );

      }


      /*
       * ETAPA 3
       * Verificar formato.
       */

      if (
        !packageData ||
        typeof packageData !==
          "object"
      ) {

        throw new Error(
          "Estrutura do backup inválida."
        );

      }


      if (
        packageData.format !==
        "Origon58 Encrypted Backup"
      ) {

        throw new Error(
          "Este não é um backup Origon58."
        );

      }


      if (
        packageData.version !==
        BACKUP_VERSION
      ) {

        throw new Error(
          "Versão do backup incompatível."
        );

      }


      /*
       * ETAPA 4
       * Verificar KDF.
       */

      if (
        !packageData.kdf ||
        packageData.kdf.name !==
          "PBKDF2" ||
        packageData.kdf.hash !==
          "SHA-256" ||
        !Number.isInteger(
          packageData.kdf.iterations
        ) ||
        typeof packageData.kdf.salt !==
          "string"
      ) {

        throw new Error(
          "Configuração PBKDF2 inválida."
        );

      }


      /*
       * ETAPA 5
       * Verificar AES-GCM.
       */

      if (
        !packageData.cipher ||
        packageData.cipher.name !==
          "AES-GCM" ||
        typeof packageData.cipher.iv !==
          "string" ||
        typeof packageData.ciphertext !==
          "string"
      ) {

        throw new Error(
          "Estrutura AES-GCM inválida."
        );

      }


      /*
       * ETAPA 6
       * Converter salt.
       */

      const salt =
        base64ToBytes(
          packageData.kdf.salt
        );


      if (
        salt.length !== 16
      ) {

        throw new Error(
          "Salt inválido."
        );

      }


      /*
       * ETAPA 7
       * Derivar a chave usando
       * exatamente os parâmetros
       * gravados no arquivo.
       */

      const key =
        await deriveAESKey(
          password,
          salt,
          packageData.kdf.iterations
        );


      /*
       * ETAPA 8
       * Descriptografar.
       */

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


      /*
       * ETAPA 9
       * Validar conteúdo.
       */

      if (
        !payload ||
        payload.format !==
          "origon58-backup"
      ) {

        throw new Error(
          "Conteúdo do backup inválido."
        );

      }


      if (
        payload.version !==
        BACKUP_VERSION
      ) {

        throw new Error(
          "Versão interna incompatível."
        );

      }


      if (
        !payload.config ||
        !payload.vault
      ) {

        throw new Error(
          "Backup incompleto."
        );

      }


      if (
        payload.config.format !==
          "Origon58 Config" ||
        !Array.isArray(
          payload.config.passwordVerifiers
        ) ||
        payload.config.passwordVerifiers.length !==
          3
      ) {

        throw new Error(
          "Configuração do backup inválida."
        );

      }


      if (
        payload.vault.format !==
          "Origon58 Encrypted Vault"
      ) {

        throw new Error(
          "Cofre do backup inválido."
        );

      }


      /*
       * ETAPA 10
       * Salvar somente depois
       * de tudo ser validado.
       */

      saveConfig(
        payload.config
      );


      localStorage.setItem(
        VAULT_KEY,
        JSON.stringify(
          payload.vault
        )
      );


      /*
       * Limpar sessão atual.
       */

      sessionKey =
        null;

      vaultData =
        null;

      temporaryBackup =
        null;


      closeModal(
        decryptModal
      );


      loginForm.reset();


      showScreen(
        loginScreen
      );


      loginMessage.textContent =
        "Backup restaurado com sucesso! Informe as três senhas do cofre.";

    } catch (
      error
    ) {

      console.error(
        "ERRO AO RESTAURAR BACKUP:",
        error
      );


      /*
       * Não apagar nem modificar
       * o cofre existente quando
       * a restauração falhar.
       */

      decryptMessage.textContent =
        "Não foi possível descriptografar este backup.";

    }

  }
);


/* =========================================================
   SERVICE WORKER
   ========================================================= */

if (
  "serviceWorker" in
  navigator
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
              "Erro ao registrar Service Worker:",
              error
            );

          }
        );

    }
  );

}


/* =========================================================
   INICIALIZAÇÃO
   ========================================================= */

function initialize() {

  const config =
    getConfig();


  if (!config) {

    showScreen(
      setupScreen
    );

    return;

  }


  showScreen(
    loginScreen
  );

}


initialize();
