# Origon58

Cofre pessoal criptografado executado diretamente no navegador.

## Projeto #017

O Origon58 foi desenvolvido como um cofre pessoal local, sem banco de dados e sem serviços externos.

## Tecnologias

- HTML
- CSS
- JavaScript
- localStorage
- Web Crypto API
- PBKDF2
- SHA-256
- AES-GCM
- Service Worker
- Cache API
- arquivos `.enc`

## Características

- Três senhas para acesso ao cofre
- Senhas de acesso não armazenadas em texto puro
- Dados do cofre criptografados
- Cada informação pode possuir sua própria senha
- Cada informação pode ser salva individualmente como `.enc`
- Backup geral criptografado
- Senha exclusiva para cada backup
- Restauração de backup
- Bloqueio da sessão
- Limpeza do cofre
- Limpeza dos dados temporários
- Funcionamento offline após o carregamento inicial
- Compatibilidade com celular e computador
- Sem banco de dados
- Sem servidor próprio
- Sem serviço pago

## Segurança

O Origon58 utiliza a Web Crypto API do navegador.

As senhas de acesso são transformadas em verificadores usando PBKDF2 com SHA-256.

O conteúdo do cofre é protegido com AES-GCM.

Cada dado individual possui:

- seu próprio salt
- sua própria chave derivada
- seu próprio IV
- seu próprio ciphertext

A senha usada para criptografar um dado individual não é armazenada pelo aplicativo.

A senha usada para um backup também não é armazenada.

## Arquivos `.enc`

Os arquivos `.enc` podem ser copiados manualmente para outro dispositivo.

O navegador não consegue verificar se uma cópia foi realmente feita para um pendrive. Essa etapa é feita pelo usuário.

## Backup geral

O backup geral contém:

- configuração necessária do cofre
- verificadores das três senhas
- cofre criptografado
- informações necessárias para restauração

O conteúdo do backup é novamente protegido por uma senha exclusiva do backup.

## Armazenamento

O Origon58 utiliza localStorage para guardar os dados criptografados.

O localStorage não é, por si só, um armazenamento seguro.

A proteção dos dados depende da criptografia utilizada pelo aplicativo.

## Offline

O Service Worker utiliza Cache API para manter os arquivos principais disponíveis depois que o aplicativo já foi carregado.

## Limitações

O Origon58 é um projeto pessoal executado no navegador.

Ele não deve ser considerado equivalente a um gerenciador profissional de senhas.

Um dispositivo ou navegador completamente controlado por outra pessoa pode comprometer qualquer aplicação executada localmente.

## Uso recomendado

Antes de armazenar informações reais:

1. Criar as três senhas de acesso.
2. Testar o login.
3. Criar dados falsos.
4. Criptografar os dados.
5. Descriptografar os dados.
6. Criar um backup.
7. Salvar o backup `.enc`.
8. Copiar o backup para um pendrive.
9. Restaurar o backup em outro dispositivo.
10. Testar novamente.
11. Testar o modo offline.
12. Limpar o cofre.
13. Confirmar que os dados foram apagados.
14. Somente depois utilizar informações reais.

## Projeto pessoal

Origon58
Projeto #017
