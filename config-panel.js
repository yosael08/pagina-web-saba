// ==============================================================================
// PANEL DE CONFIGURACIÓN: LOGIN + GESTOR DE COMUNICADOS (RESPALDADO EN GITHUB)
// Este archivo es compartido por index.html y noticias.html.
// ==============================================================================
(function () {
    const CREDENTIALS = { user: 'denis', pass: 'denis2026' };

    const GH_OWNER = 'yosael08';
    const GH_REPO = 'pagina-web-saba';
    const GH_BRANCH = 'master';
    const GH_API_BASE = `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents`;
    const SITE_ORIGIN = 'https://bandaindependientesaba.com';
    const DATA_PATH = 'data/comunicados.json';
    const TOKEN_KEY = 'bis_gh_pat';

    const configModal = document.getElementById('config-modal');
    const configOpenBtns = document.querySelectorAll('.config-open-trigger');
    const configCloseBtn = document.getElementById('config-close-btn');
    const configLoginView = document.getElementById('config-login-view');
    const configAppView = document.getElementById('config-app-view');
    const configLoginForm = document.getElementById('config-login-form');
    const configLoginError = document.getElementById('config-login-error');
    const configLogoutBtn = document.getElementById('config-logout-btn');

    const btnViewCreate = document.getElementById('btn-view-create');
    const btnViewHistory = document.getElementById('btn-view-history');
    const panelCreateView = document.getElementById('panel-create-view');
    const panelHistoryView = document.getElementById('panel-history-view');

    const ghTokenInput = document.getElementById('gh-token-input');
    const ghTokenSaveBtn = document.getElementById('gh-token-save-btn');
    const ghTokenClearBtn = document.getElementById('gh-token-clear-btn');
    const ghTokenStatus = document.getElementById('gh-token-status');

    const postForm = document.getElementById('post-form');
    const postTitle = document.getElementById('post-title');
    const postBody = document.getElementById('post-body');
    const postFontWeight = document.getElementById('post-font-weight');
    const postFontColor = document.getElementById('post-font-color');
    const postImage = document.getElementById('post-image');
    const postImageSize = document.getElementById('post-image-size');
    const postImageRemove = document.getElementById('post-image-remove');
    const postImagePreviewWrap = document.getElementById('post-image-preview-wrap');
    const postImagePreview = document.getElementById('post-image-preview');
    const previewPostTitle = document.getElementById('preview-post-title');
    const previewPostBody = document.getElementById('preview-post-body');
    const editingBanner = document.getElementById('editing-banner');
    const btnPublishPost = document.getElementById('btn-publish-post');
    const btnCancelPost = document.getElementById('btn-cancel-post');

    const historyList = document.getElementById('history-list');
    const historyEmpty = document.getElementById('history-empty');

    const comunicadosList = document.getElementById('comunicados-list');
    const comunicadosEmpty = document.getElementById('comunicados-empty');

    if (!configModal) return;

    let currentImageAction = 'none'; // 'none' | 'new' | 'remove'
    let newImageDataUrl = null;
    let existingImagePath = null;
    let editingId = null;

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str == null ? '' : str;
        return div.innerHTML;
    }

    function imageSizeToMaxWidth(size) {
        return { small: '260px', medium: '420px', large: '100%' }[size] || '420px';
    }

    function utf8ToBase64(str) {
        return btoa(unescape(encodeURIComponent(str)));
    }
    function base64ToUtf8(b64) {
        return decodeURIComponent(escape(atob(b64)));
    }

    // ---------- ABRIR / CERRAR MODAL ----------
    configOpenBtns.forEach(btn => btn.addEventListener('click', () => {
        configModal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        const mobileMenuEl = document.getElementById('mobile-menu');
        if (mobileMenuEl) mobileMenuEl.classList.add('hidden');
        refreshTokenStatus();
    }));

    function closeConfigModal() {
        configModal.classList.add('hidden');
        document.body.style.overflow = '';
    }
    if (configCloseBtn) configCloseBtn.addEventListener('click', closeConfigModal);
    configModal.addEventListener('click', (e) => {
        if (e.target === configModal) closeConfigModal();
    });

    // ---------- LOGIN ----------
    if (configLoginForm) {
        configLoginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const user = document.getElementById('config-username').value.trim();
            const pass = document.getElementById('config-password').value;
            if (user === CREDENTIALS.user && pass === CREDENTIALS.pass) {
                configLoginView.classList.add('hidden');
                configAppView.classList.remove('hidden');
                configLoginError.classList.add('hidden');
                configLoginForm.reset();
                refreshTokenStatus();
                showCreateView();
            } else {
                configLoginError.classList.remove('hidden');
            }
        });
    }

    if (configLogoutBtn) {
        configLogoutBtn.addEventListener('click', () => {
            configAppView.classList.add('hidden');
            configLoginView.classList.remove('hidden');
            resetForm();
        });
    }

    // Si esta página no tiene el panel completo (solo login), detenemos aquí.
    if (!postForm) return;

    // ---------- TOKEN DE GITHUB ----------
    function getGhToken() { return localStorage.getItem(TOKEN_KEY) || ''; }
    function refreshTokenStatus() {
        if (!ghTokenStatus) return;
        if (getGhToken()) {
            ghTokenStatus.textContent = 'Conectado';
            ghTokenStatus.className = 'text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700';
        } else {
            ghTokenStatus.textContent = 'Sin conectar';
            ghTokenStatus.className = 'text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600';
        }
    }
    ghTokenSaveBtn.addEventListener('click', () => {
        const val = ghTokenInput.value.trim();
        if (!val) { alert('Pega un token válido antes de guardar.'); return; }
        localStorage.setItem(TOKEN_KEY, val);
        ghTokenInput.value = '';
        refreshTokenStatus();
        alert('Token guardado en este navegador.');
    });
    ghTokenClearBtn.addEventListener('click', () => {
        localStorage.removeItem(TOKEN_KEY);
        refreshTokenStatus();
    });
    function requireGhToken() {
        if (!getGhToken()) {
            alert('Primero configura tu Token de GitHub (sección "Conexión con GitHub") para poder publicar cambios reales.');
            ghTokenInput.focus();
            return false;
        }
        return true;
    }

    // ---------- LLAMADAS A LA API DE GITHUB (CONTENTS API) ----------
    async function ghRequest(path, options = {}) {
        const token = getGhToken();
        const res = await fetch(`${GH_API_BASE}/${path}`, {
            ...options,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/vnd.github+json',
                'X-GitHub-Api-Version': '2022-11-28',
                ...(options.headers || {})
            }
        });
        return res;
    }

    async function ghGetFile(path) {
        const res = await ghRequest(`${path}?ref=${GH_BRANCH}`);
        if (res.status === 404) return null;
        if (!res.ok) throw new Error(`No se pudo leer ${path} (HTTP ${res.status})`);
        const data = await res.json();
        return { sha: data.sha, contentBase64: (data.content || '').replace(/\n/g, '') };
    }

    async function ghPutFile(path, base64Content, message) {
        const existing = await ghGetFile(path);
        const res = await ghRequest(path, {
            method: 'PUT',
            body: JSON.stringify({
                message,
                content: base64Content,
                branch: GH_BRANCH,
                ...(existing ? { sha: existing.sha } : {})
            })
        });
        if (!res.ok) {
            const errBody = await res.json().catch(() => ({}));
            throw new Error(errBody.message || `No se pudo guardar ${path} (HTTP ${res.status})`);
        }
        return res.json();
    }

    async function ghDeleteFile(path, message) {
        const existing = await ghGetFile(path);
        if (!existing) return;
        const res = await ghRequest(path, {
            method: 'DELETE',
            body: JSON.stringify({ message, sha: existing.sha, branch: GH_BRANCH })
        });
        if (!res.ok) {
            const errBody = await res.json().catch(() => ({}));
            throw new Error(errBody.message || `No se pudo eliminar ${path} (HTTP ${res.status})`);
        }
    }

    async function fetchAdminComunicados() {
        const file = await ghGetFile(DATA_PATH);
        if (!file) return [];
        try {
            return JSON.parse(base64ToUtf8(file.contentBase64));
        } catch (e) {
            return [];
        }
    }

    async function fetchPublicComunicados() {
        try {
            const res = await fetch('data/comunicados.json', { cache: 'no-store' });
            if (!res.ok) return [];
            return await res.json();
        } catch (e) {
            return [];
        }
    }

    // ---------- PLANTILLA DE PÁGINA INDIVIDUAL (CON ETIQUETAS OPEN GRAPH) ----------
    // Las etiquetas de documento (html/head/body/script) se arman por concatenación
    // a propósito: si quedan escritas de forma literal en este archivo, herramientas
    // de recarga automática (como la extensión Live Server) las detectan por error
    // al buscar dónde inyectar su propio script, y cortan este archivo por la mitad.
    function buildArticleHtml(article) {
        const fecha = new Date(article.date).toLocaleDateString('es-HN', { dateStyle: 'long' });
        const description = (article.body || '').trim().replace(/\s+/g, ' ').slice(0, 160);
        const imageUrl = article.image ? `${SITE_ORIGIN}/${article.image}` : `${SITE_ORIGIN}/IMAGENES/logobisdorado.png`;
        const pageUrl = `${SITE_ORIGIN}/comunicados/${article.id}.html`;
        const maxW = imageSizeToMaxWidth(article.imageSize);
        const imageBlock = article.image
            ? `<div class="w-full bg-slate-50 flex items-center justify-center p-4"><img src="../${article.image}" alt="${escapeHtml(article.title)}" style="max-width:${maxW}" class="rounded-xl object-cover max-h-[420px] w-full"></div>`
            : '';

        const T = (name) => ({ open: '<' + name + '>', close: '<' + '/' + name + '>' });
        const tHtml = T('html lang="es"');
        const tHead = T('head');
        const tBody = T('body class="bg-gray-50 text-slate-800 font-[\'Poppins\'] overflow-x-hidden antialiased min-h-screen flex flex-col"');
        const tScriptTailwind = '<' + 'script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4">' + '<' + '/script>';

        return `<!DOCTYPE html>
${tHtml.open}
${tHead.open}
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(article.title)} | Banda Independiente Sabá</title>
<meta name="description" content="${escapeHtml(description)}">
<link rel="canonical" href="${pageUrl}">
<link rel="icon" type="image/png" href="../IMAGENES/logobisblanco.PNG">

<meta property="og:type" content="article">
<meta property="og:site_name" content="Banda Independiente Sabá">
<meta property="og:title" content="${escapeHtml(article.title)}">
<meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:image" content="${imageUrl}">
<meta property="og:url" content="${pageUrl}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeHtml(article.title)}">
<meta name="twitter:description" content="${escapeHtml(description)}">
<meta name="twitter:image" content="${imageUrl}">

${tScriptTailwind}
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
${tHead.close}
${tBody.open}

<nav class="bg-gradient-to-r from-[#001e99] via-[#0033ff] to-[#001177] text-white px-4 py-3 flex items-center gap-3 shadow-xl">
    <img src="../IMAGENES/logobisblanco.PNG" alt="Logo BIS" class="h-10 w-auto object-contain">
    <span class="font-bold text-sm sm:text-lg tracking-wide uppercase">Banda Independiente Sabá</span>
</nav>

<main class="flex-grow max-w-3xl mx-auto px-6 py-12 w-full">
    <a href="../noticias.html" class="inline-flex items-center gap-2 text-sm font-bold text-[#0033ff] hover:text-amber-500 mb-8 transition-colors">
        <i class="fa-solid fa-arrow-left"></i> Volver a Comunicados
    </a>

    <article class="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
        ${imageBlock}
        <div class="p-8">
            <span class="text-xs font-bold text-amber-500 uppercase tracking-wider">${fecha}</span>
            <h1 class="text-2xl md:text-4xl mb-6 mt-2 leading-tight" style="font-weight:${article.fontWeight};color:${article.color};">${escapeHtml(article.title)}</h1>
            <p class="text-base leading-relaxed whitespace-pre-line" style="font-weight:${article.fontWeight};color:${article.color};">${escapeHtml(article.body)}</p>
        </div>
    </article>
</main>

<footer class="bg-slate-950 text-gray-400 text-center text-xs py-6">
    &copy; 2026 Banda Independiente Sabá. Todos los derechos reservados.
</footer>
${tBody.close}
${tHtml.close}`;
    }

    // ---------- CAMBIO DE VISTA (CREAR / HISTORIAL) ----------
    function showCreateView() {
        panelCreateView.classList.remove('hidden');
        panelHistoryView.classList.add('hidden');
        btnViewCreate.className = "text-xs font-bold px-4 py-2 rounded-lg transition-all bg-[#0033ff] text-white shadow-md";
        btnViewHistory.className = "text-xs font-bold px-4 py-2 rounded-lg transition-all bg-slate-100 text-slate-600 hover:bg-slate-200";
    }
    function showHistoryView() {
        panelCreateView.classList.add('hidden');
        panelHistoryView.classList.remove('hidden');
        btnViewHistory.className = "text-xs font-bold px-4 py-2 rounded-lg transition-all bg-[#0033ff] text-white shadow-md";
        btnViewCreate.className = "text-xs font-bold px-4 py-2 rounded-lg transition-all bg-slate-100 text-slate-600 hover:bg-slate-200";
        renderHistory();
    }
    btnViewCreate.addEventListener('click', showCreateView);
    btnViewHistory.addEventListener('click', showHistoryView);

    // ---------- VISTA PREVIA EN VIVO ----------
    function updateLivePreview() {
        const title = postTitle.value.trim() || 'El título aparecerá aquí';
        const body = postBody.value.trim() || 'El cuerpo del texto aparecerá aquí con el estilo elegido.';
        previewPostTitle.textContent = title;
        previewPostTitle.style.fontWeight = postFontWeight.value;
        previewPostTitle.style.color = postFontColor.value;
        previewPostBody.textContent = body;
        previewPostBody.style.fontWeight = postFontWeight.value;
        previewPostBody.style.color = postFontColor.value;
    }
    [postTitle, postBody, postFontWeight, postFontColor].forEach(el => {
        el.addEventListener('input', updateLivePreview);
        el.addEventListener('change', updateLivePreview);
    });

    // ---------- MANEJO DE IMAGEN (CON COMPRESIÓN AUTOMÁTICA) ----------
    postImage.addEventListener('change', () => {
        const file = postImage.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const img = new Image();
            img.onload = () => {
                const maxW = 900;
                const scale = Math.min(1, maxW / img.width);
                const canvas = document.createElement('canvas');
                canvas.width = img.width * scale;
                canvas.height = img.height * scale;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                newImageDataUrl = canvas.toDataURL('image/jpeg', 0.75);
                currentImageAction = 'new';
                postImagePreview.src = newImageDataUrl;
                postImagePreviewWrap.classList.remove('hidden');
                postImageRemove.classList.remove('hidden');
            };
            img.src = ev.target.result;
        };
        reader.readAsDataURL(file);
    });

    postImageRemove.addEventListener('click', () => {
        currentImageAction = 'remove';
        newImageDataUrl = null;
        postImage.value = '';
        postImagePreviewWrap.classList.add('hidden');
        postImageRemove.classList.add('hidden');
    });

    // ---------- RESET / CANCELAR ----------
    function resetForm() {
        postForm.reset();
        currentImageAction = 'none';
        newImageDataUrl = null;
        existingImagePath = null;
        editingId = null;
        postImagePreviewWrap.classList.add('hidden');
        postImageRemove.classList.add('hidden');
        editingBanner.classList.add('hidden');
        btnPublishPost.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> Publicar';
        updateLivePreview();
    }
    btnCancelPost.addEventListener('click', resetForm);

    // ---------- PUBLICAR / GUARDAR CAMBIOS (COMMIT REAL A GITHUB) ----------
    postForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!requireGhToken()) return;

        const id = editingId || Date.now();
        const wasEditing = !!editingId;
        btnPublishPost.disabled = true;
        btnPublishPost.innerHTML = '<i class="fa-solid fa-spinner animate-spin"></i> Publicando en GitHub...';

        try {
            const list = await fetchAdminComunicados();
            const existing = editingId ? list.find(p => p.id === editingId) : null;

            let finalImagePath = existingImagePath;
            if (currentImageAction === 'new') {
                finalImagePath = `IMAGENES/comunicados/${id}.jpg`;
                const pureBase64 = newImageDataUrl.split(',')[1];
                await ghPutFile(finalImagePath, pureBase64, `Imagen de comunicado: ${postTitle.value.trim()}`);
            } else if (currentImageAction === 'remove' && existingImagePath) {
                await ghDeleteFile(existingImagePath, `Eliminar imagen de comunicado ${id}`);
                finalImagePath = null;
            }

            const articleData = {
                id,
                title: postTitle.value.trim(),
                body: postBody.value.trim(),
                fontWeight: postFontWeight.value,
                color: postFontColor.value,
                image: finalImagePath,
                imageSize: postImageSize.value,
                date: existing ? existing.date : new Date().toISOString()
            };

            const articleHtml = buildArticleHtml(articleData);
            await ghPutFile(`comunicados/${id}.html`, utf8ToBase64(articleHtml), `Página de comunicado: ${articleData.title}`);

            const updatedList = editingId
                ? list.map(p => p.id === editingId ? articleData : p)
                : [articleData, ...list];
            await ghPutFile(DATA_PATH, utf8ToBase64(JSON.stringify(updatedList, null, 2)), 'Actualizar índice de comunicados');

            const permalink = `${SITE_ORIGIN}/comunicados/${id}.html`;
            alert(`¡Publicación ${wasEditing ? 'actualizada' : 'creada'} con éxito!\n\nEstará visible en el sitio en aproximadamente 1 minuto en:\n${permalink}`);
            resetForm();
            showCreateView();
            renderHistory();
        } catch (err) {
            console.error(err);
            alert('Ocurrió un error al publicar en GitHub: ' + err.message + '\n\nVerifica que tu token sea válido y tenga permiso de escritura sobre el repositorio.');
            btnPublishPost.innerHTML = wasEditing
                ? '<i class="fa-solid fa-floppy-disk"></i> Guardar Cambios'
                : '<i class="fa-solid fa-cloud-arrow-up"></i> Publicar';
        } finally {
            btnPublishPost.disabled = false;
        }
    });

    // ---------- HISTORIAL (VISTA ADMIN) ----------
    async function renderHistory() {
        if (!getGhToken()) {
            historyList.innerHTML = '';
            historyEmpty.textContent = 'Configura tu Token de GitHub para ver el historial de publicaciones.';
            historyEmpty.classList.remove('hidden');
            return;
        }
        historyEmpty.classList.add('hidden');
        historyList.innerHTML = '<p class="text-center text-slate-400 text-sm py-6"><i class="fa-solid fa-spinner animate-spin"></i> Cargando publicaciones desde GitHub...</p>';

        let list;
        try {
            list = await fetchAdminComunicados();
        } catch (err) {
            historyList.innerHTML = `<p class="text-center text-red-500 text-sm py-6">Error al cargar el historial: ${escapeHtml(err.message)}</p>`;
            return;
        }

        historyList.innerHTML = '';
        if (list.length === 0) {
            historyEmpty.textContent = 'No has publicado ningún artículo todavía.';
            historyEmpty.classList.remove('hidden');
            return;
        }
        historyEmpty.classList.add('hidden');

        list.forEach(post => {
            const item = document.createElement('div');
            item.className = 'flex flex-wrap items-center justify-between gap-3 bg-slate-50 border border-slate-200 rounded-xl p-4';
            const fecha = new Date(post.date).toLocaleString('es-HN', { dateStyle: 'medium', timeStyle: 'short' });
            item.innerHTML = `
                <div class="min-w-0">
                    <p class="font-bold text-slate-800 truncate">${escapeHtml(post.title)}</p>
                    <p class="text-[11px] text-slate-400">${fecha}</p>
                </div>
                <div class="flex gap-2 shrink-0 flex-wrap">
                    <button type="button" class="btn-edit-post bg-blue-50 hover:bg-[#0033ff] text-[#0033ff] hover:text-white font-bold px-3 py-2 rounded-lg text-xs transition-all" data-id="${post.id}">
                        <i class="fa-solid fa-pen"></i> Modificar
                    </button>
                    <button type="button" class="btn-share-post bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white font-bold px-3 py-2 rounded-lg text-xs transition-all" data-id="${post.id}">
                        <i class="fa-solid fa-link"></i> Compartir Enlace
                    </button>
                    <button type="button" class="btn-delete-post bg-red-50 hover:bg-red-600 text-red-600 hover:text-white font-bold px-3 py-2 rounded-lg text-xs transition-all" data-id="${post.id}">
                        <i class="fa-solid fa-trash-can"></i> Eliminar
                    </button>
                </div>
            `;
            historyList.appendChild(item);
        });

        historyList.querySelectorAll('.btn-edit-post').forEach(btn => {
            btn.addEventListener('click', () => loadPostForEdit(Number(btn.dataset.id)));
        });
        historyList.querySelectorAll('.btn-delete-post').forEach(btn => {
            btn.addEventListener('click', () => deletePost(Number(btn.dataset.id)));
        });
        historyList.querySelectorAll('.btn-share-post').forEach(btn => {
            btn.addEventListener('click', () => shareArticleLink(Number(btn.dataset.id)));
        });
    }

    async function shareArticleLink(id) {
        const url = `${SITE_ORIGIN}/comunicados/${id}.html`;
        try {
            await navigator.clipboard.writeText(url);
            alert('Enlace copiado al portapapeles:\n' + url);
        } catch (e) {
            prompt('Copia este enlace para compartirlo:', url);
        }
    }

    async function loadPostForEdit(id) {
        const list = await fetchAdminComunicados();
        const post = list.find(p => p.id === id);
        if (!post) return;
        editingId = id;
        postTitle.value = post.title;
        postBody.value = post.body;
        postFontWeight.value = post.fontWeight;
        postFontColor.value = post.color;
        postImageSize.value = post.imageSize || 'medium';
        existingImagePath = post.image || null;
        currentImageAction = 'none';
        newImageDataUrl = null;
        postImage.value = '';
        if (existingImagePath) {
            postImagePreview.src = existingImagePath;
            postImagePreviewWrap.classList.remove('hidden');
            postImageRemove.classList.remove('hidden');
        } else {
            postImagePreviewWrap.classList.add('hidden');
            postImageRemove.classList.add('hidden');
        }
        editingBanner.classList.remove('hidden');
        btnPublishPost.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Guardar Cambios';
        updateLivePreview();
        showCreateView();
    }

    async function deletePost(id) {
        if (!requireGhToken()) return;
        if (!confirm('¿Seguro que deseas eliminar permanentemente esta publicación? Esta acción se aplicará en GitHub y no se puede deshacer.')) return;
        try {
            const list = await fetchAdminComunicados();
            const target = list.find(p => p.id === id);
            const updatedList = list.filter(p => p.id !== id);

            await ghPutFile(DATA_PATH, utf8ToBase64(JSON.stringify(updatedList, null, 2)), `Eliminar comunicado ${id}`);
            await ghDeleteFile(`comunicados/${id}.html`, `Eliminar página de comunicado ${id}`);
            if (target && target.image) {
                await ghDeleteFile(target.image, `Eliminar imagen de comunicado ${id}`);
            }

            if (editingId === id) resetForm();
            alert('Publicación eliminada. Los cambios se reflejarán en el sitio en aproximadamente 1 minuto.');
            renderHistory();
        } catch (err) {
            console.error(err);
            alert('Error al eliminar la publicación: ' + err.message);
        }
    }

    // ---------- RENDER PÚBLICO: TARJETAS DE VISTA PREVIA (SOLO EN noticias.html) ----------
    async function renderComunicados() {
        if (!comunicadosList) return;
        comunicadosList.innerHTML = '<p class="col-span-full text-center text-slate-400 text-sm py-10"><i class="fa-solid fa-spinner animate-spin"></i> Cargando comunicados...</p>';
        comunicadosEmpty.classList.add('hidden');

        const posts = await fetchPublicComunicados();
        comunicadosList.innerHTML = '';
        if (posts.length === 0) {
            comunicadosEmpty.classList.remove('hidden');
            return;
        }
        comunicadosEmpty.classList.add('hidden');

        posts.forEach(post => {
            const card = document.createElement('a');
            card.href = `comunicados/${post.id}.html`;
            card.className = 'bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden flex flex-col hover:-translate-y-1 hover:shadow-2xl transition-all duration-300 group';
            const fecha = new Date(post.date).toLocaleDateString('es-HN', { dateStyle: 'long' });
            const bodyText = post.body || '';
            const excerpt = bodyText.length > 130 ? bodyText.slice(0, 130) + '…' : bodyText;

            let imageBlock = '';
            if (post.image) {
                imageBlock = `<div class="w-full h-48 bg-slate-50 overflow-hidden"><img src="${post.image}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"></div>`;
            }

            card.innerHTML = `
                ${imageBlock}
                <div class="p-6 flex flex-col flex-grow">
                    <span class="text-[11px] font-bold text-amber-500 uppercase tracking-wider mb-2">${fecha}</span>
                    <h3 class="text-lg mb-2 leading-snug"></h3>
                    <p class="text-sm leading-relaxed flex-grow"></p>
                    <span class="mt-4 text-xs font-bold text-[#0033ff] group-hover:text-amber-500 transition-colors inline-flex items-center gap-1.5">Leer comunicado completo <i class="fa-solid fa-arrow-right text-[10px]"></i></span>
                </div>
            `;
            const h3 = card.querySelector('h3');
            const p = card.querySelector('p');
            h3.textContent = post.title;
            h3.style.fontWeight = post.fontWeight;
            h3.style.color = post.color;
            p.textContent = excerpt;
            p.style.fontWeight = post.fontWeight;
            p.style.color = post.color;

            const img = card.querySelector('img');
            if (img) img.alt = post.title;

            comunicadosList.appendChild(card);
        });
    }

    // Renderiza los comunicados ya existentes al cargar la página (no hace nada si no existe el contenedor)
    renderComunicados();
})();
