# Origon58

Cofre pessoal com criptografia local para proteger informações individuais.

## 🔐 Como funciona

O Origon58 utiliza três senhas para proteger o acesso ao cofre.

As senhas de acesso não são armazenadas em texto puro.

O sistema utiliza:

- Web Crypto API
- PBKDF2
- SHA-256
- AES-GCM
- localStorage
- Service Worker
- funcionamento offline

## 📦 Dados individuais

Cada informação adicionada ao cofre é criptografada separadamente.

Ao adicionar um dado:

1. Escreva a informação.
2. Crie uma senha para aquele dado.
3. Confirme a senha.
4. Clique em `CRIPTOGRAFAR`.

Depois disso, o dado fica armazenado no cofre em formato criptografado.

Cada dado possui seus próprios parâmetros criptográficos.

## 🔓 Descriptografar

Cada dado possui seu próprio botão:

`🔓 DESCRIPTOGRAFAR`

Esse botão serve somente para o dado correspondente.

A senha daquele dado é solicitada para revelar o conteúdo.

## 💾 Salvar .ENC

Cada dado também possui:

`💾 SALVAR .ENC`

Esse botão cria um arquivo `.enc` contendo somente aquele dado criptografado.

Os arquivos podem ser copiados manualmente para um pendrive ou outro meio de armazenamento.

O arquivo salvo não contém a senha do dado.

## 🗑️ Excluir

Cada dado possui seu próprio botão:

`🗑️ EXCLUIR`

Ele remove somente aquele dado do cofre.

## 🔓 Descriptografar dado salvo

O cofre possui o botão:

`🔓 DESCRIPTOGRAFAR DADO SALVO`

Essa função é destinada a arquivos `.enc` individuais que estejam fora do cofre.

Exemplo:

1. Salvar um dado usando `SALVAR .ENC`.
2. Copiar o arquivo para um pendrive.
3. Conectar o pendrive em outro computador.
4. Copiar o arquivo para o dispositivo.
5. Abrir o Origon58.
6. Entrar no cofre.
7. Clicar em `DESCRIPTOGRAFAR DADO SALVO`.
8. Selecionar o arquivo `.enc`.
9. Informar a senha daquele dado.
10. Descriptografar.

O conteúdo é mostrado na tela.

O arquivo externo não é automaticamente adicionado ao cofre.

## 🧹 Limpar temporários

O botão:

`🧹 LIMPAR TEMPORÁRIOS`

remove informações temporárias utilizadas durante operações externas.

Ele não deve apagar os dados armazenados no cofre.

## 🗑️ Limpar cofre

O botão:

`🗑️ LIMPAR COFRE`

permite apagar os dados armazenados no cofre.

A operação possui confirmações antes da exclusão.

## 🔒 Voltar para a senha

O botão:

`🔒 VOLTAR PARA A SENHA`

sai do cofre e retorna para a tela de acesso.

Os dados armazenados não são apagados.

## 🌐 Funcionamento offline

O Origon58 possui um Service Worker.

Depois que os arquivos necessários forem armazenados no cache do navegador, o site pode continuar funcionando sem internet.

## 💾 Armazenamento

Os dados do cofre ficam no armazenamento local do navegador.

Não existe banco de dados externo.

Não existe servidor próprio para armazenar os dados.

Não existe sincronização automática entre dispositivos.

## ⚠️ Importante

O Origon58 é um projeto pessoal baseado em tecnologias executadas no próprio navegador.

A criptografia protege os dados armazenados, mas isso não significa proteção absoluta contra um dispositivo ou navegador completamente comprometido.

As senhas dos dados individuais não são armazenadas pelo sistema.

Se a senha de um dado individual for perdida, o conteúdo daquele dado não poderá ser descriptografado pelo Origon58.

Os arquivos `.enc` devem ser guardados com cuidado.

O GitHub contém apenas os arquivos do projeto e não deve conter informações pessoais reais.

## 📁 Estrutura

```text
Origon58/
├── index.html
├── style.css
├── script.js
├── sw.js
├── manifest.json
└── README.md
