# 📚 GUÍA COMPLETA DE FLUJO DE TRABAJO EN GIT/GITHUB

## 📍 TU SITUACIÓN ACTUAL

**Repositorio:** `https://github.com/Gerion9/OCR_MSolis.git`  
**Rama actual:** `DCL_V1` (solo local, NO está en GitHub aún)  
**Usuario Git:** `msrmv`  
**Email Git:** `rmacias@manuelsolis.com`  
**Cambios pendientes:** `backend/main.py` modificado

---

## 🔍 ANÁLISIS DE TU ESTADO ACTUAL

### Ramas Locales:
- ✅ `DCL_V1` (tu rama actual) ← **ESTÁS AQUÍ**
- ✅ `main`

### Ramas Remotas (GitHub):
- ✅ `origin/main` (rama principal en GitHub)
- ❌ `origin/DCL_V1` **NO EXISTE AÚN** ← **NECESITAS CREARLA**

### Archivos Modificados:
```bash
modified:   backend/main.py
```
**Estado:** Sin staged (no agregados al commit)

---

## 📋 FLUJO DE TRABAJO COMPLETO: DESDE CREAR RAMA HASTA GITHUB

### PASO 1: Crear una Rama (✅ YA LO HICISTE)

```bash
# Opción A: Desde main
git checkout main
git pull origin main  # Actualizar con cambios remotos
git checkout -b DCL_V1  # Crear nueva rama

# Opción B: Desde donde estás
git branch DCL_V1  # Crear rama
git checkout DCL_V1  # Cambiar a esa rama
```

**Tu situación:** Ya estás en `DCL_V1` ✓

---

### PASO 2: Hacer Cambios (✅ YA LO HICISTE)

Modificaste archivos:
- `backend/main.py`
- `frontend/script.js`
- Etc.

---

### PASO 3: Ver Qué Cambió

```bash
# Ver archivos modificados
git status

# Ver cambios específicos en un archivo
git diff backend/main.py

# Ver todos los cambios
git diff
```

**Ejecutar ahora:**
```bash
git status
```

**Resultado esperado:**
```
On branch DCL_V1
Changes not staged for commit:
  modified:   backend/main.py
```

---

### PASO 4: Agregar Cambios al Staging (PREPARAR COMMIT)

```bash
# Opción A: Agregar archivo específico
git add backend/main.py

# Opción B: Agregar múltiples archivos
git add backend/main.py frontend/script.js

# Opción C: Agregar TODO (cuidado)
git add .

# Opción D: Agregar todos los archivos modificados (recomendado)
git add -A
```

**Recomendación para ti:**
```bash
git add backend/main.py frontend/script.js
```

---

### PASO 5: Hacer Commit (GUARDAR CAMBIOS)

```bash
# Commit con mensaje descriptivo
git commit -m "feat: implementar streaming, bloqueo de botones y nombres personalizados"

# O con mensaje más detallado
git commit -m "feat: mejoras UX y funcionalidad

- Implementar streaming de Gemini
- Bloquear botones durante generación
- Nombres personalizados en descarga
- Límite de 5 documentos
- Auto-scroll durante generación"
```

**Formato de mensajes (buenas prácticas):**
- `feat:` - Nueva funcionalidad
- `fix:` - Corrección de bug
- `docs:` - Documentación
- `style:` - Cambios de estilo (CSS)
- `refactor:` - Refactorización de código
- `test:` - Tests
- `chore:` - Tareas de mantenimiento

---

### PASO 6: Ver Historial de Commits

```bash
# Ver commits recientes
git log --oneline

# Ver commits con detalles
git log

# Ver commits con gráfico de ramas
git log --oneline --graph --all
```

---

### PASO 7: Subir la Rama a GitHub (PRIMERA VEZ)

```bash
# Primera vez (crear rama en GitHub)
git push -u origin DCL_V1

# Explicación:
# - push: subir cambios
# - -u: establecer upstream (tracking)
# - origin: nombre del remoto (GitHub)
# - DCL_V1: nombre de tu rama
```

**Después del primer push:**
```bash
# Pushes futuros (más simple)
git push
```

---

### PASO 8: Verificar en GitHub

1. Ir a: `https://github.com/Gerion9/OCR_MSolis`
2. Hacer clic en el dropdown de "Branch: main"
3. **Deberías ver tu rama:** `DCL_V1`
4. Hacer clic en ella para ver los cambios

---

### PASO 9: Crear Pull Request (PR)

#### Opción A: Desde GitHub (Recomendado)

1. Ve a: `https://github.com/Gerion9/OCR_MSolis`
2. Verás un banner amarillo: **"DCL_V1 had recent pushes"**
3. Haz clic en **"Compare & pull request"**
4. Rellena el formulario:
   - **Title:** "Implementar streaming, UX improvements y multi-documento"
   - **Description:** Explicar cambios detalladamente
   - **Base:** `main` (rama destino)
   - **Compare:** `DCL_V1` (tu rama)
5. Haz clic en **"Create pull request"**

#### Opción B: Manualmente

1. Ve a: `https://github.com/Gerion9/OCR_MSolis/pulls`
2. Clic en **"New pull request"**
3. **Base:** `main`
4. **Compare:** `DCL_V1`
5. Clic en **"Create pull request"**

---

### PASO 10: Review y Merge

**Tu Senior revisará el PR y:**
- ✅ Aprobará → Merge a `main`
- 💬 Comentará → Solicitar cambios
- ❌ Rechazará → Explicar por qué

**Si pide cambios:**
1. Haz los cambios localmente
2. `git add .`
3. `git commit -m "fix: correcciones solicitadas"`
4. `git push`
5. El PR se actualiza automáticamente ✨

---

## 🚀 COMANDOS RÁPIDOS PARA TU SITUACIÓN ACTUAL

### Para Subir tus Cambios AHORA:

```bash
# 1. Ver qué cambió
git status

# 2. Agregar archivos modificados
git add backend/main.py frontend/script.js frontend/styles.css

# 3. Hacer commit
git commit -m "feat: implementar mejoras UX y streaming

- Límite de 5 documentos + validación duplicados
- Scroll horizontal en tabs
- Spinner de carga con animación
- Velocidad de streaming natural (30ms)
- Auto-scroll durante generación
- Bloqueo de botones durante generación
- Nombres personalizados en descarga"

# 4. Subir a GitHub (primera vez)
git push -u origin DCL_V1

# 5. Crear Pull Request en GitHub
# (Ir al navegador y seguir paso 9)
```

---

## 📊 DIAGRAMA DE FLUJO

```
┌─────────────────────────────────────────────────────────┐
│                  FLUJO DE TRABAJO GIT                    │
└─────────────────────────────────────────────────────────┘

1. LOCAL (tu computadora)
   ┌──────────────────┐
   │  git checkout -b │  ← Crear rama
   │     DCL_V1       │
   └────────┬─────────┘
            ↓
   ┌──────────────────┐
   │  Hacer cambios   │  ← Editar archivos
   │  en código       │
   └────────┬─────────┘
            ↓
   ┌──────────────────┐
   │    git add .     │  ← Agregar al staging
   └────────┬─────────┘
            ↓
   ┌──────────────────┐
   │  git commit -m   │  ← Guardar cambios
   │    "mensaje"     │
   └────────┬─────────┘
            ↓
            
2. SUBIR A GITHUB
   ┌──────────────────┐
   │   git push -u    │  ← Primera vez
   │  origin DCL_V1   │
   └────────┬─────────┘
            ↓
            
3. GITHUB (navegador)
   ┌──────────────────┐
   │ Crear Pull       │  ← Revisar cambios
   │    Request       │
   └────────┬─────────┘
            ↓
   ┌──────────────────┐
   │  Review por      │  ← Senior revisa
   │     Senior       │
   └────────┬─────────┘
            ↓
   ┌──────────────────┐
   │  Merge a main    │  ← Integrar cambios
   └──────────────────┘
```

---

## 🔄 FLUJOS COMUNES

### Actualizar tu Rama con Main

```bash
# Si main tuvo cambios nuevos
git checkout main
git pull origin main
git checkout DCL_V1
git merge main

# O más simple (rebase)
git checkout DCL_V1
git pull origin main --rebase
```

### Deshacer Cambios Locales

```bash
# Deshacer cambios en un archivo (no commiteado)
git restore backend/main.py

# Deshacer último commit (mantener cambios)
git reset --soft HEAD~1

# Deshacer último commit (PERDER cambios)
git reset --hard HEAD~1  # ⚠️ CUIDADO
```

### Ver Diferencias

```bash
# Entre tu rama y main
git diff main..DCL_V1

# Archivos que cambiaron
git diff --name-only main..DCL_V1

# Ver cambios de un commit específico
git show <commit-hash>
```

---

## 📝 MEJORES PRÁCTICAS

### ✅ DO (Hacer):

1. **Commits pequeños y frecuentes**
   ```bash
   git commit -m "feat: agregar validación de duplicados"
   git commit -m "feat: implementar spinner de carga"
   ```

2. **Mensajes descriptivos**
   ```bash
   ✅ "feat: implementar streaming de Gemini"
   ❌ "cambios"
   ```

3. **Pull antes de Push**
   ```bash
   git pull origin DCL_V1
   git push
   ```

4. **Revisar antes de commit**
   ```bash
   git status
   git diff
   git add -p  # Agregar por partes
   ```

### ❌ DON'T (No hacer):

1. **Commit de archivos sensibles**
   ```bash
   ❌ .env
   ❌ *.key
   ❌ passwords.txt
   ```

2. **Commits gigantes**
   ```bash
   ❌ 50 archivos en un commit
   ✅ Varios commits pequeños
   ```

3. **Push --force a main**
   ```bash
   ❌ git push --force origin main
   ```

4. **Trabajo directo en main**
   ```bash
   ❌ git checkout main → hacer cambios
   ✅ git checkout -b nueva-rama → hacer cambios
   ```

---

## 🆘 SOLUCIÓN DE PROBLEMAS

### Error: "failed to push some refs"

```bash
# Alguien más hizo push primero
git pull origin DCL_V1 --rebase
git push
```

### Error: "Authentication failed"

```bash
# Usar Personal Access Token (PAT) en lugar de password
# GitHub → Settings → Developer settings → Personal access tokens
```

### Error: "refusing to merge unrelated histories"

```bash
git pull origin main --allow-unrelated-histories
```

### Conflictos de Merge

```bash
# Aparecen marcadores en el archivo:
<<<<<<< HEAD
tu código
=======
código de main
>>>>>>> main

# Resolución:
1. Editar archivo manualmente
2. Remover marcadores <<<, ===, >>>
3. git add archivo.py
4. git commit -m "fix: resolver conflictos de merge"
```

---

## 📋 CHECKLIST: SUBIR CAMBIOS A GITHUB

- [ ] 1. Verificar rama actual: `git branch`
- [ ] 2. Ver cambios: `git status`
- [ ] 3. Revisar diferencias: `git diff`
- [ ] 4. Agregar archivos: `git add <files>`
- [ ] 5. Hacer commit: `git commit -m "mensaje"`
- [ ] 6. Subir a GitHub: `git push -u origin DCL_V1`
- [ ] 7. Verificar en GitHub: Ver rama en navegador
- [ ] 8. Crear Pull Request: En GitHub
- [ ] 9. Esperar review: Senior revisa
- [ ] 10. Merge: Senior aprueba y hace merge

---

## 🎯 TU PRÓXIMO PASO INMEDIATO

### COMANDO COMPLETO PARA EJECUTAR AHORA:

```powershell
# Ver tus cambios
git status

# Agregar archivos (ajusta según tus cambios)
git add backend/main.py frontend/script.js frontend/styles.css

# Si agregaste archivos nuevos también:
git add UX_IMPROVEMENTS_V2.md CONFIGURACION_API_KEY.md CAMBIOS_FINALES_RESUMEN.md

# Hacer commit
git commit -m "feat: implementar mejoras UX completas

- Límite de 5 documentos con validación de duplicados
- Scroll horizontal en tabs de documentos
- Spinner animado durante generación (estilo ChatGPT)
- Velocidad de streaming natural (30ms delay)
- Auto-scroll automático durante generación
- Bloqueo de botones Download/Regenerate durante generación
- Nombres personalizados en descarga (DeclarationLetter_[Nombre]_draft)
- Documentación completa de cambios"

# Subir a GitHub (primera vez)
git push -u origin DCL_V1

# Después verás un link en la consola para crear el PR
# O ve a: https://github.com/Gerion9/OCR_MSolis/pulls
```

---

## 🌐 URLS ÚTILES

- **Repositorio:** https://github.com/Gerion9/OCR_MSolis
- **Pull Requests:** https://github.com/Gerion9/OCR_MSolis/pulls
- **Branches:** https://github.com/Gerion9/OCR_MSolis/branches
- **Settings:** https://github.com/Gerion9/OCR_MSolis/settings

---

## 📚 RECURSOS ADICIONALES

### Aprender más:
- [GitHub Docs](https://docs.github.com/es)
- [Git Cheat Sheet](https://education.github.com/git-cheat-sheet-education.pdf)
- [Visualizing Git](https://git-school.github.io/visualizing-git/)

### Comandos útiles:
```bash
# Ver configuración
git config --list

# Ver ramas remotas
git branch -r

# Ver último commit
git log -1

# Ver quién cambió cada línea
git blame archivo.py

# Buscar en commits
git log --grep="streaming"
```

---

## ✅ RESUMEN EJECUTIVO

**Tu situación:**
- ✅ Git configurado correctamente
- ✅ Estás en rama `DCL_V1`
- ✅ Tienes cambios pendientes
- ❌ Tu rama NO está en GitHub aún

**Qué hacer:**
1. `git add <archivos>`
2. `git commit -m "mensaje"`
3. `git push -u origin DCL_V1`
4. Crear Pull Request en GitHub
5. Esperar review de tu Senior

**Tiempo estimado:** 5-10 minutos

---

**Creado:** Octubre 2024  
**Para:** msrmv (rmacias@manuelsolis.com)  
**Proyecto:** OCR_MSolis Declaration Letter System


