"use strict";


/* ==================================================
   CONFIGURAÇÕES
================================================== */

const CONFIG_KEY =
  "origon58_config_v4";

const VAULT_KEY =
  "origon58_vault_v4";

const CONFIG_VERSION =
  4;

const VAULT_VERSION =
  4;

const ITEM_VERSION =
  4;

const PBKDF2_ITERATIONS =
  250000;


/* ==================================================
   ESTADO TEMPORÁRIO
================================================== */

let currentVaultKey = null;

let temporarySavedData = null;


/* ==================================================
   ELEMENTOS
================================================== */

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


const dataList =
  document.getElementById(
    "dataList"
  );

const dataCount =
  document.getElementById(
    "dataCount"
  );


const addDataButton =
  document.getElementById(
    "addDataButton"
  );

const clearVaultButton =
  document.getElementById(
    "clearVaultButton"
  );

const clearTemporaryButton =
  document.getElementById(
    "clearTemporaryButton"
  );

const decryptSavedButton =
  document.getElementById(
    "decryptSavedButton"
  );

const logoutButton =
  document.getElementById(
    "logoutButton"
  );

const lockButton =
  document.getElementById(
    "lockButton"
  );


/* ==================================================
   MODAL — ADICIONAR DADO
================================================== */

const addDataModal =
  document.getElementById(
    "addDataModal"
  );

const cancelAddDataButton =
  document.getElementById(
    "cancelAddDataButton"
  );

const encryptDataButton =
  document.getElementById(
    "encryptDataButton"
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

const addDataMessage =
  document.getElementById(
    "addDataMessage"
  );


/* ==================================================
   MODAL — LIMPAR COFRE
================================================== */

const clearVaultModal =
  document.getElementById(
    "clearVaultModal"
  );

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
   MODAL — DADO SALVO
================================================== */

const decryptSavedModal =
  document.getElementById(
    "decryptSavedModal"
  );

const cancelDecryptSavedButton =
  document.getElementById(
    "cancelDecryptSavedButton"
  );

const confirmDecryptSavedButton =
  document.getElementById(
    "confirmDecryptSavedButton"
  );

const savedDataFile =
  document.getElementById(
    "savedDataFile"
  );

const savedDataPassword =
  document.getElementById(
    "savedDataPassword"
  );

const decryptSavedMessage =
  document.getElementById(
    "decryptSavedMessage"
  );

const savedDataResult =
  document.getElementById(
    "savedDataResult"
  );

const savedDataResultText =
  document.getElementById(
    "savedDataResultText"
  );


/* ==================================================
   UTILITÁRIOS
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


function randomBytes(
  length
) {

  const bytes =
    new Uint8Array(
      length
    );

  crypto.getRandomValues(
    bytes
  );

  return bytes;

}


function bytesToBase64(
  bytes
) {

  let binary = "";

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

  return btoa(
    binary
  );

}


function base64ToBytes(
  base64
) {

  const binary =
    atob(
      base64
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


function textToBytes(
  text
) {

  return new TextEncoder().encode(
    text
  );

}


function bytesToText(
  bytes
) {

  return new TextDecoder().decode(
    bytes
  );

}


function createId() {

  return (
    Date.now().toString(
      36
    ) +
    "-" +
    crypto.randomUUID()
  );

}


/* ==================================================
   CRIPTOGRAFIA
================================================== */

async function deriveKey(
  password,
  salt
) {

  const passwordBytes =
    textToBytes(
      password
    );

  const material =
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
      name:
        "PBKDF2",

      salt,

      iterations:
        PBKDF2_ITERATIONS,

      hash:
        "SHA-256"
    },
    material,
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


async function encryptText(
  text,
  password
) {

  const salt =
    randomBytes(
      16
    );

  const iv =
    randomBytes(
      12
    );

  const key =
    await deriveKey(
      password,
      salt
    );

  const encrypted =
    await crypto.subtle.encrypt(
      {
        name:
          "AES-GCM",

        iv
      },
      key,
      textToBytes(
        text
      )
    );

  return {

    salt:
      bytesToBase64(
        salt
      ),

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
  password
) {

  const salt =
    base64ToBytes(
      packageData.kdf.salt
    );

  const iv =
    base64ToBytes(
      packageData.cipher.iv
    );

  const ciphertext =
    base64ToBytes(
      packageData.ciphertext
    );

  const key =
    await deriveKey(
      password,
      salt
    );

  const decrypted =
    await crypto.subtle.decrypt(
      {
        name:
          "AES-GCM",

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
   CONFIGURAÇÃO DAS 3 SENHAS
================================================== */

async function createVerifier(
  password
) {

  const salt =
    randomBytes(
      16
    );

  const key =
    await deriveKey(
      password,
      salt
    );

  const exported =
    await crypto.subtle.exportKey(
      "raw",
      key
    );

  return {

    salt:
      bytesToBase64(
        salt
      ),

    verifier:
      bytesToBase64(
        new Uint8Array(
          exported
        )
      )

  };

}


async function verifyPassword(
  password,
  stored
) {

  try {

    const salt =
      base64ToBytes(
        stored.salt
      );

    const key =
      await deriveKey(
        password,
        salt
      );

    const exported =
      await crypto.subtle.exportKey(
        "raw",
        key
      );

    const actual =
      new Uint8Array(
        exported
      );

    const expected =
      base64ToBytes(
        stored.verifier
      );

    if (
      actual.length !==
      expected.length
    ) {

      return false;

    }

    let result = 0;

    for (
      let i = 0;
      i < actual.length;
      i++
    ) {

      result |=
        actual[i] ^
        expected[i];

    }

    return result === 0;

  } catch (
    error
  ) {

    return false;

  }

}


/* ==================================================
   COFRE
================================================== */

function getEmptyVault() {

  return {

    version:
      VAULT_VERSION,

    items:
      []

  };

}


function loadConfig() {

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

  } catch (
    error
  ) {

    return null;

  }

}


function loadVault() {

  const raw =
    localStorage.getItem(
      VAULT_KEY
    );

  if (!raw) {

    return getEmptyVault();

  }

  try {

    return JSON.parse(
      raw
    );

  } catch (
    error
  ) {

    return getEmptyVault();

  }

}


function saveVault(
  vault
) {

  localStorage.setItem(
    VAULT_KEY,
    JSON.stringify(
      vault
    )
  );

}


/* ==================================================
   CRIPTOGRAFIA DO COFRE
================================================== */

async function createVaultKey(
  passwords
) {

  const combined =
    passwords.join(
      "\u0000"
    );

  const salt =
    randomBytes(
      16
    );

  const material =
    await crypto.subtle.importKey(
      "raw",
      textToBytes(
        combined
      ),
      "PBKDF2",
      false,
      [
        "deriveKey"
      ]
    );

  const key =
    await crypto.subtle.deriveKey(
      {
        name:
          "PBKDF2",

        salt,

        iterations:
          PBKDF2_ITERATIONS,

        hash:
          "SHA-256"
      },
      material,
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

  return {
    key,
    salt
  };

}


async function encryptVault(
  vault,
  passwords
) {

  const combined =
    passwords.join(
      "\u0000"
    );

  const salt =
    randomBytes(
      16
    );

  const iv =
    randomBytes(
      12
    );

  const material =
    await crypto.subtle.importKey(
      "raw",
      textToBytes(
        combined
      ),
      "PBKDF2",
      false,
      [
        "deriveKey"
      ]
    );

  const key =
    await crypto.subtle.deriveKey(
      {
        name:
          "PBKDF2",

        salt,

        iterations:
          PBKDF2_ITERATIONS,

        hash:
          "SHA-256"
      },
      material,
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

  const payload =
    JSON.stringify(
      vault
    );

  const encrypted =
    await crypto.subtle.encrypt(
      {
        name:
          "AES-GCM",

        iv
      },
      key,
      textToBytes(
        payload
      )
    );

  return {

    format:
      "Origon58 Encrypted Vault",

    version:
      VAULT_VERSION,

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
        bytesToBase64(
          iv
        )

    },

    ciphertext:
      bytesToBase64(
        new Uint8Array(
          encrypted
        )
      )

  };

}


async function decryptVault(
  packageData,
  passwords
) {

  const combined =
    passwords.join(
      "\u0000"
    );

  const salt =
    base64ToBytes(
      packageData.kdf.salt
    );

  const iv =
    base64ToBytes(
      packageData.cipher.iv
    );

  const ciphertext =
    base64ToBytes(
      packageData.ciphertext
    );

  const material =
    await crypto.subtle.importKey(
      "raw",
      textToBytes(
        combined
      ),
      "PBKDF2",
      false,
      [
        "deriveKey"
      ]
    );

  const key =
    await crypto.subtle.deriveKey(
      {
        name:
          "PBKDF2",

        salt,

        iterations:
          packageData.kdf.iterations,

        hash:
          "SHA-256"
      },
      material,
      {
        name:
          "AES-GCM",

        length:
          256
      },
      false,
      [
        "decrypt"
      ]
    );

  const decrypted =
    await crypto.subtle.decrypt(
      {
        name:
          "AES-GCM",

        iv
      },
      key,
      ciphertext
    );

  return JSON.parse(
    bytesToText(
      new Uint8Array(
        decrypted
      )
    )
  );

}


/* ==================================================
   DADOS INDIVIDUAIS
================================================== */

async function createEncryptedItem(
  text,
  password
) {

  const encrypted =
    await encryptText(
      text,
      password
    );

  return {

    format:
      "Origon58 Secure Item",

    version:
      ITEM_VERSION,

    id:
      createId(),

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
        encrypted.salt

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

}


async function decryptItem(
  item,
  password
) {

  return decryptText(
    item,
    password
  );

}


/* ==================================================
   ARQUIVO .ENC INDIVIDUAL
================================================== */

function createItemFile(
  item
) {

  const payload = {

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

  return new Blob(
    [
      JSON.stringify(
        payload,
        null,
        2
      )
    ],
    {
      type:
        "application/octet-stream"
    }
  );

}


async function saveItemFile(
  item
) {

  const blob =
    createItemFile(
      item
    );

  const filename =
    "origon58-item-" +
    item.id +
    ".enc";


  if (
    "showSaveFilePicker" in
    window
  ) {

    try {

      const handle =
        await window.showSaveFilePicker(
          {
            suggestedName:
              filename,

            types: [
              {
                description:
                  "Arquivo criptografado Origon58",

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

      alert(
        "Dado salvo com sucesso! 💾"
      );

      return;

    } catch (
      error
    ) {

      if (
        error.name ===
        "AbortError"
      ) {

        return;

      }

    }

  }


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

  alert(
    "Dado salvo com sucesso! 💾"
  );

}


/* ==================================================
   RENDERIZAÇÃO
================================================== */

function renderVault() {

  const vault =
    loadVault();

  dataList.innerHTML =
    "";

  dataCount.textContent =
    String(
      vault.items.length
    );


  if (
    vault.items.length ===
    0
  ) {

    dataList.innerHTML =
      `
        <div class="empty-state">
          Nenhum dado criptografado no cofre.
        </div>
      `;

    return;

  }


  vault.items.forEach(
    (
      item,
      index
    ) => {

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
        "Dado " +
        (index + 1);


      const ciphertext =
        document.createElement(
          "div"
        );

      ciphertext.className =
        "ciphertext";

      ciphertext.textContent =
        item.ciphertext;


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

      decryptButton.className =
        "secondary-button";

      decryptButton.textContent =
        "🔓 DESCRIPTOGRAFAR";


      const saveButton =
        document.createElement(
          "button"
        );

      saveButton.type =
        "button";

      saveButton.className =
        "primary-button";

      saveButton.textContent =
        "💾 SALVAR .ENC";


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


      decryptButton.addEventListener(
        "click",
        async () => {

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

          if (
            password.length ===
            0
          ) {

            alert(
              "Digite a senha."
            );

            return;

          }


          try {

            const text =
              await decryptItem(
                item,
                password
              );

            alert(
              "Conteúdo descriptografado:\n\n" +
              text
            );

          } catch (
            error
          ) {

            alert(
              "Senha incorreta ou dado inválido."
            );

          }

        }
      );


      saveButton.addEventListener(
        "click",
        async () => {

          await saveItemFile(
            item
          );

        }
      );


      deleteButton.addEventListener(
        "click",
        () => {

          const confirmed =
            confirm(
              "Excluir este dado do cofre?"
            );

          if (
            !confirmed
          ) {

            return;

          }


          const vault =
            loadVault();

          vault.items =
            vault.items.filter(
              (
                currentItem
              ) =>
                currentItem.id !==
                item.id
            );

          saveVault(
            vault
          );

          renderVault();

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
        ciphertext
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
   MODAL — ADICIONAR DADO
================================================== */

function openAddDataModal() {

  newDataText.value =
    "";

  newDataPassword.value =
    "";

  newDataPasswordConfirm.value =
    "";

  addDataMessage.textContent =
    "";

  addDataModal.classList.remove(
    "hidden"
  );

  newDataText.focus();

}


function closeAddDataModal() {

  addDataModal.classList.add(
    "hidden"
  );

}


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
  async () => {

    const text =
      newDataText.value;

    const password =
      newDataPassword.value;

    const confirmation =
      newDataPasswordConfirm.value;


    addDataMessage.textContent =
      "";


    if (
      !text.trim()
    ) {

      addDataMessage.textContent =
        "Digite uma informação.";

      return;

    }


    if (
      !password
    ) {

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

      encryptDataButton.disabled =
        true;

      encryptDataButton.textContent =
        "CRIPTOGRAFANDO...";


      const item =
        await createEncryptedItem(
          text,
          password
        );


      const vault =
        loadVault();

      vault.items.push(
        item
      );

      saveVault(
        vault
      );


      closeAddDataModal();

      renderVault();


    } catch (
      error
    ) {

      addDataMessage.textContent =
        "Não foi possível criptografar o dado.";

    } finally {

      encryptDataButton.disabled =
        false;

      encryptDataButton.textContent =
        "🔐 CRIPTOGRAFAR";

    }

  }
);


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

    clearVaultModal.classList.remove(
      "hidden"
    );

    clearVaultPassword.focus();

  }
);


cancelClearVaultButton.addEventListener(
  "click",
  () => {

    clearVaultModal.classList.add(
      "hidden"
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


    clearVaultMessage.textContent =
      "";


    if (
      !password
    ) {

      clearVaultMessage.textContent =
        "Crie uma senha para confirmar a limpeza.";

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


    const firstConfirmation =
      confirm(
        "ATENÇÃO: todos os dados do cofre serão apagados. Continuar?"
      );

    if (
      !firstConfirmation
    ) {

      return;

    }


    const secondConfirmation =
      confirm(
        "Confirma novamente que deseja APAGAR TODOS OS DADOS?"
      );

    if (
      !secondConfirmation
    ) {

      return;

    }


    localStorage.removeItem(
      VAULT_KEY
    );


    clearVaultModal.classList.add(
      "hidden"
    );


    renderVault();


    alert(
      "Cofre limpo com sucesso."
    );

  }
);


/* ==================================================
   LIMPAR TEMPORÁRIOS
================================================== */

clearTemporaryButton.addEventListener(
  "click",
  () => {

    temporarySavedData =
      null;

    savedDataFile.value =
      "";

    savedDataPassword.value =
      "";

    savedDataResult.classList.add(
      "hidden"
    );

    savedDataResultText.textContent =
      "";

    decryptSavedMessage.textContent =
      "";


    alert(
      "Dados temporários foram excluídos."
    );

  }
);


/* ==================================================
   DESCRIPTOGRAFAR DADO SALVO
================================================== */

function openDecryptSavedModal() {

  savedDataFile.value =
    "";

  savedDataPassword.value =
    "";

  decryptSavedMessage.textContent =
    "";

  savedDataResult.classList.add(
    "hidden"
  );

  savedDataResultText.textContent =
    "";

  decryptSavedModal.classList.remove(
    "hidden"
  );

}


function closeDecryptSavedModal() {

  decryptSavedModal.classList.add(
    "hidden"
  );

}


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
  async () => {

    decryptSavedMessage.textContent =
      "";

    savedDataResult.classList.add(
      "hidden"
    );


    const file =
      savedDataFile.files[0];

    const password =
      savedDataPassword.value;


    if (
      !file
    ) {

      decryptSavedMessage.textContent =
        "Escolha um arquivo .enc.";

      return;

    }


    if (
      !password
    ) {

      decryptSavedMessage.textContent =
        "Digite a senha do dado.";

      return;

    }


    try {

      confirmDecryptSavedButton.disabled =
        true;

      confirmDecryptSavedButton.textContent =
        "DESCRIPTOGRAFANDO...";


      const rawText =
        await file.text();


      const packageData =
        JSON.parse(
          rawText
        );


      if (
        packageData.format !==
        "origon58-item"
      ) {

        throw new Error(
          "Arquivo incompatível."
        );

      }


      if (
        packageData.version !==
        ITEM_VERSION
      ) {

        throw new Error(
          "Versão incompatível."
        );

      }


      if (
        !packageData.kdf ||
        !packageData.cipher ||
        !packageData.ciphertext
      ) {

        throw new Error(
          "Estrutura inválida."
        );

      }


      const text =
        await decryptText(
          packageData,
          password
        );


      temporarySavedData =
        text;


      savedDataResultText.textContent =
        text;

      savedDataResult.classList.remove(
        "hidden"
      );


      decryptSavedMessage.textContent =
        "Dado descriptografado com sucesso!";


    } catch (
      error
    ) {

      decryptSavedMessage.textContent =
        "Não foi possível descriptografar este dado. Verifique o arquivo e a senha.";

    } finally {

      confirmDecryptSavedButton.disabled =
        false;

      confirmDecryptSavedButton.textContent =
        "🔓 DESCRIPTOGRAFAR";

    }

  }
);


/* ==================================================
   SAIR / VOLTAR PARA SENHA
================================================== */

function logout() {

  currentVaultKey =
    null;

  temporarySavedData =
    null;


  loginForm.reset();

  loginMessage.textContent =
    "";


  showScreen(
    loginScreen
  );

}


logoutButton.addEventListener(
  "click",
  logout
);


lockButton.addEventListener(
  "click",
  logout
);


/* ==================================================
   CONFIGURAÇÃO INICIAL
================================================== */

setupForm.addEventListener(
  "submit",
  async (
    event
  ) => {

    event.preventDefault();

    setupMessage.textContent =
      "";


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
      password1 !==
      password1Confirm ||
      password2 !==
      password2Confirm ||
      password3 !==
      password3Confirm
    ) {

      setupMessage.textContent =
        "As senhas não conferem.";

      return;

    }


    if (
      !password1 ||
      !password2 ||
      !password3
    ) {

      setupMessage.textContent =
        "Preencha as três senhas.";

      return;

    }


    try {

      const verifiers =
        await Promise.all(
          [
            password1,
            password2,
            password3
          ].map(
            createVerifier
          )
        );


      const vault =
        getEmptyVault();


      const encryptedVault =
        await encryptVault(
          vault,
          [
            password1,
            password2,
            password3
          ]
        );


      const config = {

        format:
          "Origon58 Configuration",

        version:
          CONFIG_VERSION,

        verifiers,

        vaultSalt:
          encryptedVault.kdf.salt

      };


      localStorage.setItem(
        CONFIG_KEY,
        JSON.stringify(
          config
        )
      );


      localStorage.setItem(
        VAULT_KEY,
        JSON.stringify(
          vault
        )
      );


      setupForm.reset();


      showScreen(
        loginScreen
      );


      alert(
        "Acesso criado com sucesso!"
      );


    } catch (
      error
    ) {

      setupMessage.textContent =
        "Não foi possível criar o acesso.";

    }

  }
);


/* ==================================================
   LOGIN
================================================== */

loginForm.addEventListener(
  "submit",
  async (
    event
  ) => {

    event.preventDefault();

    loginMessage.textContent =
      "";


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
      loadConfig();


    if (
      !config ||
      !config.verifiers
    ) {

      showScreen(
        setupScreen
      );

      return;

    }


    const valid1 =
      await verifyPassword(
        password1,
        config.verifiers[0]
      );

    const valid2 =
      await verifyPassword(
        password2,
        config.verifiers[1]
      );

    const valid3 =
      await verifyPassword(
        password3,
        config.verifiers[2]
      );


    if (
      !valid1 ||
      !valid2 ||
      !valid3
    ) {

      loginMessage.textContent =
        "por que quer entrar aqui 🤨";

      loginForm.reset();

      return;

    }


    currentVaultKey =
      true;


    loginForm.reset();

    renderVault();

    showScreen(
      vaultScreen
    );

  }
);


/* ==================================================
   SERVICE WORKER
================================================== */

if (
  "serviceWorker" in
  navigator
) {

  window.addEventListener(
    "load",
    async () => {

      try {

        const registration =
          await navigator.serviceWorker.register(
            "./sw.js"
          );

        await registration.update();

      } catch (
        error
      ) {

        console.warn(
          "Service Worker não registrado:",
          error
        );

      }

    }
  );

}


/* ==================================================
   INICIALIZAÇÃO
================================================== */

function initialize() {

  const config =
    loadConfig();


  if (
    config &&
    config.verifiers
  ) {

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
