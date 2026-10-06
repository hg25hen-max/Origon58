"use strict";


/* ==================================================
   ORIGON58
   Projeto #017

   Estrutura inicial.

   A lógica completa de criptografia,
   armazenamento, backups e restauração
   será adicionada nas próximas etapas.
================================================== */


/* ==================================================
   ELEMENTOS PRINCIPAIS
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


/* ==================================================
   ELEMENTOS DO COFRE
================================================== */

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


const logoutButton =
  document.getElementById(
    "logoutButton"
  );


const lockButton =
  document.getElementById(
    "lockButton"
  );


/* ==================================================
   ELEMENTOS DO MODAL DE DADOS
================================================== */

const addDataModal =
  document.getElementById(
    "addDataModal"
  );


const cancelAddDataButton =
  document.getElementById(
    "cancelAddDataButton"
  );


/* ==================================================
   ELEMENTOS DO MODAL DE LIMPEZA
================================================== */

const clearVaultModal =
  document.getElementById(
    "clearVaultModal"
  );


const cancelClearVaultButton =
  document.getElementById(
    "cancelClearVaultButton"
  );


/* ==================================================
   MOSTRAR TELA
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
   ABRIR ADICIONAR DADO
================================================== */

function openAddDataModal() {

  addDataModal.classList.remove(
    "hidden"
  );

}


/* ==================================================
   FECHAR ADICIONAR DADO
================================================== */

function closeAddDataModal() {

  addDataModal.classList.add(
    "hidden"
  );

}


/* ==================================================
   ABRIR LIMPAR COFRE
================================================== */

function openClearVaultModal() {

  clearVaultModal.classList.remove(
    "hidden"
  );

}


/* ==================================================
   FECHAR LIMPAR COFRE
================================================== */

function closeClearVaultModal() {

  clearVaultModal.classList.add(
    "hidden"
  );

}


/* ==================================================
   EVENTOS VISUAIS INICIAIS
================================================== */

addDataButton.addEventListener(
  "click",
  openAddDataModal
);


cancelAddDataButton.addEventListener(
  "click",
  closeAddDataModal
);


clearVaultButton.addEventListener(
  "click",
  openClearVaultModal
);


cancelClearVaultButton.addEventListener(
  "click",
  closeClearVaultModal
);


/* ==================================================
   VOLTAR PARA A SENHA
================================================== */

function logoutToLogin() {

  showScreen(
    loginScreen
  );

}


logoutButton.addEventListener(
  "click",
  logoutToLogin
);


lockButton.addEventListener(
  "click",
  logoutToLogin
);


/* ==================================================
   LIMPAR TEMPORÁRIOS
================================================== */

clearTemporaryButton.addEventListener(
  "click",
  () => {

    alert(
      "Os dados temporários serão tratados aqui."
    );

  }
);


/* ==================================================
   CONFIGURAÇÃO INICIAL TEMPORÁRIA
================================================== */

setupForm.addEventListener(
  "submit",
  (event) => {

    event.preventDefault();

    setupMessage.textContent =
      "A configuração criptografada será adicionada na próxima etapa.";

  }
);


/* ==================================================
   LOGIN TEMPORÁRIO
================================================== */

loginForm.addEventListener(
  "submit",
  (event) => {

    event.preventDefault();

    loginMessage.textContent =
      "A autenticação será adicionada na próxima etapa.";

  }
);


/* ==================================================
   INICIALIZAÇÃO VISUAL
================================================== */

showScreen(
  setupScreen
);
