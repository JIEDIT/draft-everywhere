/* =================================================================
   Draft → Everywhere — VISUAL PREVIEW BUILD
   Real layout, real JIEDIT styling, mock content. No API call yet —
   the "Generate" button re-renders the same mock set so the
   interaction (loading state, tabs, chips, meter, copy) can be
   reviewed without a backend. Ported structure/behavior from the
   original prototype (parseDelimited, chip editor, i18n re-walk,
   clipboard fallback) so this becomes the real app.js later with
   callClaude() wired to /api/generate instead of the mock.
   ================================================================= */

/* ================= i18n ================= */
const I18N = {
  zh: {
    title: '一稿<span class="accent-zh">多发</span>',
    tagline: '把 raw draft 一稿生成 X / Substack / Medium / LinkedIn / 小红书五个平台的版本,每个版本都可以原地修改。小红书自动转中文,其他平台自动转英文。',
    srcLabel:'RAW DRAFT', outLabel:'PLATFORM VERSIONS',
    draftPh:'把你的 raw draft 贴在这里……', go:'生成各平台版本',
    generating:'生成中',
    loadingGen:'正在按平台规则重新排版……',
    emptyHint:'各平台版本会在你点击"生成"之后出现在这里。生成后点上方标签,即可在平台之间切换、逐个调整。',
    xhs:'小红书',
    copyBtn:'复制文案', copied:'已复制', copyFail:'复制失败',
    chars:' 字符', errDraft:'先贴一份 raw draft。', errPlat:'至少选一个平台。',
    genFail:'生成失败,再试一次: ',
    tipLabel:'发布后提醒',
    tagPh:'输入标签,按回车添加',
    xhsTopicNote:'复制后的 # 文本仍可能需要在小红书发布界面选为原生话题。',
    statusGenerating:'生成中', statusValidating:'校验中', statusRetrying:'重试中',
    statusAdjusting:'调整长度中',
    statusReady:'已完成', statusFailed:'失败', retryPlatform:'重试',
    combinedLength:'正文 + 话题标签', xCombinedWarning:'加上可选话题标签后将超过 280 字符',
    remaining:'余', exceeded:'超出', copyLimitBlocked:'内容超出平台限制，恢复到限制内后才能复制。',
    post:'POST', posts:'POSTS', withHashtags:'加话题标签',
    clearTitle:'清除这份草稿？',
    clearBody:'这会移除 Raw Draft 和所有已生成的平台版本。<br>平台选择和显示设置将保持不变。',
    cancelClear:'取消', confirmClear:'清除草稿',
    substackNote:'SUBSTACK NOTE · 推广短帖',
    trialComplete:'免费试用已结束',
    trialCompleteBody:'现有结果仍可编辑与复制。',
    runLocal:'使用你的 API 在本地运行 →',
    trialLeft:(remaining, limit)=>`剩余 ${remaining} / ${limit} 次生成机会`,
    trialReset:date=>`重置时间 ${date}`,
    githubOwnApi:'前往 GitHub 使用你自己的 API →',
    localMode:'本地模式',
    localModeBody:'API Key 只保存在你的本地环境中。',
    providerLabel:'服务商', selectProvider:'选择服务商',
    modelLabel:'模型', selectModel:'选择模型',
    keyReady:'API KEY 已配置', keyMissing:'API KEY 未配置',
  },
  en: {
    title: 'Draft <span class="accent-en">Everywhere</span>',
    tagline: 'Turn one raw draft into platform-ready posts for X / Substack / Medium / LinkedIn / Xiaohongshu. Every version is editable in place. Xiaohongshu outputs in Chinese, everything else in English.',
    srcLabel:'RAW DRAFT', outLabel:'PLATFORM VERSIONS',
    draftPh:'Paste your raw draft here…', go:'Generate platform versions',
    generating:'Generating',
    loadingGen:'Rewriting per platform rules…',
    emptyHint:'Platform versions will appear here after you hit Generate. Then switch between platforms via the tabs above and fine-tune each one.',
    xhs:'Xiaohongshu',
    copyBtn:'Copy', copied:'Copied', copyFail:'Copy failed',
    chars:' chars', errDraft:'Paste a raw draft first.', errPlat:'Pick at least one platform.',
    genFail:'Generation failed, try again: ',
    tipLabel:'POST-PUBLISH TIP',
    tagPh:'Type a tag, press Enter to add',
    xhsTopicNote:'Copied # text may still need to be selected as native topics in Xiaohongshu.',
    statusGenerating:'Generating', statusValidating:'Validating', statusRetrying:'Retrying',
    statusAdjusting:'Adjusting length',
    statusReady:'Ready', statusFailed:'Failed', retryPlatform:'Retry',
    combinedLength:'Text + hashtags', xCombinedWarning:'Text plus optional hashtags exceeds 280 characters',
    remaining:'remaining', exceeded:'over', copyLimitBlocked:'Copy is unavailable until the content is back within the platform limit.',
    post:'POST', posts:'POSTS', withHashtags:'With hashtags',
    clearTitle:'Clear this draft?',
    clearBody:'This will remove the raw draft and all generated platform versions.<br>Your platform and display settings will stay unchanged.',
    cancelClear:'Cancel', confirmClear:'Clear Draft',
    substackNote:'SUBSTACK NOTE · PROMOTIONAL POST',
    trialComplete:'FREE TRIAL COMPLETE',
    trialCompleteBody:'Your existing results remain editable and copyable.',
    runLocal:'RUN LOCALLY WITH YOUR API →',
    trialLeft:(remaining, limit)=>`${remaining} OF ${limit} GENERATIONS LEFT`,
    trialReset:date=>`Resets ${date}`,
    githubOwnApi:'USE YOUR OWN API ON GITHUB →',
    localMode:'LOCAL MODE',
    localModeBody:'Keys stay in your local environment.',
    providerLabel:'PROVIDER', selectProvider:'SELECT PROVIDER',
    modelLabel:'MODEL', selectModel:'SELECT MODEL',
    keyReady:'API KEY READY', keyMissing:'API KEY NOT CONFIGURED',
  }
};
let lang = 'en';
function t(key){ return I18N[lang][key]; }
function applyLang(){
  document.documentElement.lang = lang;
  document.body.classList.toggle('lang-zh', lang === 'zh');
  document.querySelectorAll('[data-i18n]').forEach(el=>{
    const k = el.getAttribute('data-i18n');
    if(I18N[lang][k] !== undefined) el.innerHTML = I18N[lang][k];
  });
  document.querySelectorAll('[data-i18n-ph]').forEach(el=>{
    const k = el.getAttribute('data-i18n-ph');
    if(I18N[lang][k] !== undefined) el.placeholder = I18N[lang][k];
  });
  document.getElementById('langToggle').classList.toggle('is-zh', lang === 'zh');
  document.querySelectorAll('.tip-label').forEach(el=> el.textContent = t('tipLabel'));
  document.querySelectorAll('[data-role="note-label"]').forEach(el=> el.textContent = t('substackNote'));
  document.querySelectorAll('[data-copy-kind]').forEach(updateCopyControlLabel);
  document.querySelectorAll('.rtab[data-state]').forEach(updateJobText);
  document.querySelectorAll('[data-role="chipinput"]').forEach(el=> el.placeholder = t('tagPh'));
  document.querySelectorAll('.card').forEach(c=>{
    if(c._updateMeter) c._updateMeter();
    const tt = c.querySelector('[data-role="tiptext"]');
    if(tt) tt.textContent = lang === 'zh' ? (c._tipZh||'') : (c._tipEn||'');
    const ch = c.querySelector('[data-role="chiphint"]');
    if(ch){
      const meta = PLATFORM_META[c.dataset.platform];
      ch.textContent = chipHintText(c.dataset.platform, meta ? meta.label : '');
    }
  });
  if(runtimeState.loaded && runtimeState.capabilities) renderRuntimeStatus(runtimeState.capabilities);
}
document.getElementById('langToggle').addEventListener('click', ()=>{
  lang = lang === 'zh' ? 'en' : 'zh';
  applyLang();
});

/* Mac trackpads can hand horizontal momentum to the browser compositor even
   when the document has no horizontal overflow. Cancel only gestures whose
   horizontal delta dominates, leaving normal vertical scrolling untouched. */
window.addEventListener('wheel', event=>{
  if(Math.abs(event.deltaX) > Math.abs(event.deltaY)) event.preventDefault();
}, { passive:false });

/* ================= platform meta ================= */
const PLATFORM_META = {
  twitter:  {label:'X / Twitter', icon:'tw', limit:PLATFORM_CONSTRAINTS.twitter.hardLimit},
  substack: {label:'Substack',    icon:'sub', limit:null},
  medium:   {label:'Medium',      icon:'med', limit:null},
  xhs:      {label:'小红书 · XHS', icon:'xhs', limit:PLATFORM_CONSTRAINTS.xhs.hardLimit},
  linkedin: {label:'LinkedIn',    icon:'li',  limit:PLATFORM_CONSTRAINTS.linkedin.hardLimit},
};

/* Simple Icons (simpleicons.org / npm `simple-icons`) path data, used
   verbatim rather than redrawn — CC0-licensed brand marks. */
const ICONS = {
  tw:  { viewBox:'0 0 24 24', path:'M14.234 10.162 22.977 0h-2.072l-7.591 8.824L7.251 0H.258l9.168 13.343L.258 24H2.33l8.016-9.318L16.749 24h6.993zm-2.837 3.299-.929-1.329L3.076 1.56h3.182l5.965 8.532.929 1.329 7.754 11.09h-3.182z' },
  sub: { viewBox:'0 0 24 24', path:'M22.539 8.242H1.46V5.406h21.08v2.836zM1.46 10.812V24L12 18.11 22.54 24V10.812H1.46zM22.54 0H1.46v2.836h21.08V0z' },
  med: { viewBox:'0 0 24 24', path:'M4.21 0A4.201 4.201 0 0 0 0 4.21v15.58A4.201 4.201 0 0 0 4.21 24h15.58A4.201 4.201 0 0 0 24 19.79v-1.093c-.137.013-.278.02-.422.02-2.577 0-4.027-2.146-4.09-4.832a7.592 7.592 0 0 1 .022-.708c.093-1.186.475-2.241 1.105-3.022a3.885 3.885 0 0 1 1.395-1.1c.468-.237 1.127-.367 1.664-.367h.023c.101 0 .202.004.303.01V4.211A4.201 4.201 0 0 0 19.79 0Zm.198 5.583h4.165l3.588 8.435 3.59-8.435h3.864v.146l-.019.004c-.705.16-1.063.397-1.063 1.254h-.003l.003 10.274c.06.676.424.885 1.063 1.03l.02.004v.145h-4.923v-.145l.019-.005c.639-.144.994-.353 1.054-1.03V7.267l-4.745 11.15h-.261L6.15 7.569v9.445c0 .857.358 1.094 1.063 1.253l.02.004v.147H4.405v-.147l.019-.004c.705-.16 1.065-.397 1.065-1.253V6.987c0-.857-.358-1.094-1.064-1.254l-.018-.004zm19.25 3.668c-1.086.023-1.733 1.323-1.813 3.124H24V9.298a1.378 1.378 0 0 0-.342-.047Zm-1.862 3.632c-.1 1.756.86 3.239 2.204 3.634v-3.634z' },
  xhs: { viewBox:'0 0 24 24', path:'M22.405 9.879c.002.016.01.02.07.019h.725a.797.797 0 0 0 .78-.972.794.794 0 0 0-.884-.618.795.795 0 0 0-.692.794c0 .101-.002.666.001.777zm-11.509 4.808c-.203.001-1.353.004-1.685.003a2.528 2.528 0 0 1-.766-.126.025.025 0 0 0-.03.014L7.7 16.127a.025.025 0 0 0 .01.032c.111.06.336.124.495.124.66.01 1.32.002 1.981 0 .01 0 .02-.006.023-.015l.712-1.545a.025.025 0 0 0-.024-.036zM.477 9.91c-.071 0-.076.002-.076.01a.834.834 0 0 0-.01.08c-.027.397-.038.495-.234 3.06-.012.24-.034.389-.135.607-.026.057-.033.042.003.112.046.092.681 1.523.787 1.74.008.015.011.02.017.02.008 0 .033-.026.047-.044.147-.187.268-.391.371-.606.306-.635.44-1.325.486-1.706.014-.11.021-.22.03-.33l.204-2.616.022-.293c.003-.029 0-.033-.03-.034zm7.203 3.757a1.427 1.427 0 0 1-.135-.607c-.004-.084-.031-.39-.235-3.06a.443.443 0 0 0-.01-.082c-.004-.011-.052-.008-.076-.008h-1.48c-.03.001-.034.005-.03.034l.021.293c.076.982.153 1.964.233 2.946.05.4.186 1.085.487 1.706.103.215.223.419.37.606.015.018.037.051.048.049.02-.003.742-1.642.804-1.765.036-.07.03-.055.003-.112zm3.861-.913h-.872a.126.126 0 0 1-.116-.178l1.178-2.625a.025.025 0 0 0-.023-.035l-1.318-.003a.148.148 0 0 1-.135-.21l.876-1.954a.025.025 0 0 0-.023-.035h-1.56c-.01 0-.02.006-.024.015l-.926 2.068c-.085.169-.314.634-.399.938a.534.534 0 0 0-.02.191.46.46 0 0 0 .23.378.981.981 0 0 0 .46.119h.59c.041 0-.688 1.482-.834 1.972a.53.53 0 0 0-.023.172.465.465 0 0 0 .23.398c.15.092.342.12.475.12l1.66-.001c.01 0 .02-.006.023-.015l.575-1.28a.025.025 0 0 0-.024-.035zm-6.93-4.937H3.1a.032.032 0 0 0-.034.033c0 1.048-.01 2.795-.01 6.829 0 .288-.269.262-.28.262h-.74c-.04.001-.044.004-.04.047.001.037.465 1.064.555 1.263.01.02.03.033.051.033.157.003.767.009.938-.014.153-.02.3-.06.438-.132.3-.156.49-.419.595-.765.052-.172.075-.353.075-.533.002-2.33 0-4.66-.007-6.991a.032.032 0 0 0-.032-.032zm11.784 6.896c0-.014-.01-.021-.024-.022h-1.465c-.048-.001-.049-.002-.05-.049v-4.66c0-.072-.005-.07.07-.07h.863c.08 0 .075.004.075-.074V8.393c0-.082.006-.076-.08-.076h-3.5c-.064 0-.075-.006-.075.073v1.445c0 .083-.006.077.08.077h.854c.075 0 .07-.004.07.07v4.624c0 .095.008.084-.085.084-.37 0-1.11-.002-1.304 0-.048.001-.06.03-.06.03l-.697 1.519s-.014.025-.008.036c.006.01.013.008.058.008 1.748.003 3.495.002 5.243.002.03-.001.034-.006.035-.033v-1.539zm4.177-3.43c0 .013-.007.023-.02.024-.346.006-.692.004-1.037.004-.014-.002-.022-.01-.022-.024-.005-.434-.007-.869-.01-1.303 0-.072-.006-.071.07-.07l.733-.003c.041 0 .081.002.12.015.093.025.16.107.165.204.006.431.002 1.153.001 1.153zm2.67.244a1.953 1.953 0 0 0-.883-.222h-.18c-.04-.001-.04-.003-.042-.04V10.21c0-.132-.007-.263-.025-.394a1.823 1.823 0 0 0-.153-.53 1.533 1.533 0 0 0-.677-.71 2.167 2.167 0 0 0-1-.258c-.153-.003-.567 0-.72 0-.07 0-.068.004-.068-.065V7.76c0-.031-.01-.041-.046-.039H17.93s-.016 0-.023.007c-.006.006-.008.012-.008.023v.546c-.008.036-.057.015-.082.022h-.95c-.022.002-.028.008-.03.032v1.481c0 .09-.004.082.082.082h.913c.082 0 .072.128.072.128V11.19s.003.117-.06.117h-1.482c-.068 0-.06.082-.06.082v1.445s-.01.068.064.068h1.457c.082 0 .076-.006.076.079v3.225c0 .088-.007.081.082.081h1.43c.09 0 .082.007.082-.08v-3.27c0-.029.006-.035.033-.035l2.323-.003c.098 0 .191.02.28.061a.46.46 0 0 1 .274.407c.008.395.003.79.003 1.185 0 .259-.107.367-.33.367h-1.218c-.023.002-.029.008-.028.033.184.437.374.871.57 1.303a.045.045 0 0 0 .04.026c.17.005.34.002.51.003.15-.002.517.004.666-.01a2.03 2.03 0 0 0 .408-.075c.59-.18.975-.698.976-1.313v-1.981c0-.128-.01-.254-.034-.38 0 .078-.029-.641-.724-.998z' },
  li:  { viewBox:'0 0 24 24', path:'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z' },
};
function iconHTML(key){
  const ic = ICONS[key];
  return '<span class="p-icon ' + key + '"><svg viewBox="' + ic.viewBox + '" aria-hidden="true"><path d="' + ic.path + '"/></svg></span>';
}

/* Platforms where tags are conventionally typed inline in the post as hashtags.
   Substack and Medium enter tags in a separate field during publishing — appending
   them as #hashtags in the body would land as literal text in the article. */
const INLINE_HASHTAG_PLATFORMS = ['twitter', 'linkedin', 'xhs'];
const WORKSPACE_STORAGE_KEY = 'draft-everywhere:workspace:v1';
const RUNTIME_STORAGE_KEY = 'draft-everywhere:runtime:v1';
const runtimeState = { loaded:false, mode:null, usage:null, providers:[], provider:'', model:'', exhausted:false, capabilities:null };

function selectedProvider(){
  return runtimeState.providers.find(provider=>provider.id === runtimeState.provider) || null;
}

function updateGenerateAvailability(){
  const button = document.getElementById('go');
  if(!runtimeState.loaded){ button.disabled = true; return; }
  if(runtimeState.mode === 'trial'){
    button.disabled = runtimeState.exhausted;
    return;
  }
  const provider = selectedProvider();
  button.disabled = !(provider && provider.configured && provider.models.some(model=>model.id === runtimeState.model));
}

function persistRuntimeSelection(){
  localStorage.setItem(RUNTIME_STORAGE_KEY, JSON.stringify({ provider:runtimeState.provider, model:runtimeState.model }));
}

function renderRuntimeStatus(capabilities){
  const mount = document.querySelector('[data-role="runtime-status"]');
  const supportWidget = document.getElementById('supportWidget');
  const introRow = document.querySelector('.intro-row');
  mount.innerHTML = '';
  if(capabilities.mode === 'trial'){
    const usage = capabilities.usage;
    runtimeState.exhausted = usage.remaining <= 0;
    const resetDate = new Date(usage.resetsAt).toLocaleString(lang === 'zh' ? 'zh-CN' : 'en-US');
    mount.className = 'runtime-status trial-status' + (runtimeState.exhausted ? ' exhausted' : '');
    mount.innerHTML = runtimeState.exhausted
      ? `<div><strong>${t('trialComplete')}</strong><span>${t('trialCompleteBody')}</span><span>${t('trialReset')(resetDate)}</span></div><div data-role="runtime-support"></div><a data-role="github-local" href="${capabilities.githubUrl}" target="_blank" rel="noreferrer">${t('runLocal')}</a>`
      : `<div><strong>${t('trialLeft')(usage.remaining, usage.limit)}</strong><span>${t('trialReset')(resetDate)}</span></div><a data-role="github-local" href="${capabilities.githubUrl}" target="_blank" rel="noreferrer">${t('githubOwnApi')}</a>`;
    if(supportWidget){
      const target = runtimeState.exhausted ? mount.querySelector('[data-role="runtime-support"]') : introRow;
      target.appendChild(supportWidget);
    }
    return;
  }

  if(supportWidget) introRow.appendChild(supportWidget);
  mount.className = 'runtime-status local-status';
  mount.innerHTML = `<div class="runtime-mode"><strong>${t('localMode')}</strong><span>${t('localModeBody')}</span></div>
    <label><span>${t('providerLabel')}</span><select data-role="provider-select"><option value="">${t('selectProvider')}</option></select></label>
    <label><span>${t('modelLabel')}</span><select data-role="model-select" disabled><option value="">${t('selectModel')}</option></select></label>
    <span class="runtime-key-status" data-role="key-status"></span>`;
  const providerSelect = mount.querySelector('[data-role="provider-select"]');
  const modelSelect = mount.querySelector('[data-role="model-select"]');
  runtimeState.providers.forEach(provider=>{
    const option = document.createElement('option');
    option.value = provider.id;
    option.textContent = provider.label;
    providerSelect.appendChild(option);
  });
  let saved = null;
  try{ saved = JSON.parse(localStorage.getItem(RUNTIME_STORAGE_KEY) || 'null'); }catch(e){ /* ignore invalid preference */ }

  function populateModels(preferredModel){
    const provider = selectedProvider();
    modelSelect.innerHTML = `<option value="">${t('selectModel')}</option>`;
    modelSelect.disabled = !provider;
    runtimeState.model = '';
    if(provider){
      provider.models.forEach(model=>{
        const option = document.createElement('option');
        option.value = model.id;
        option.textContent = model.label;
        modelSelect.appendChild(option);
      });
      if(provider.models.some(model=>model.id === preferredModel)){
        modelSelect.value = preferredModel;
        runtimeState.model = preferredModel;
      }
    }
    mount.querySelector('[data-role="key-status"]').textContent = !provider ? ''
      : provider.configured ? t('keyReady') : t('keyMissing');
    updateGenerateAvailability();
  }
  providerSelect.addEventListener('change', ()=>{
    runtimeState.provider = providerSelect.value;
    populateModels('');
    persistRuntimeSelection();
  });
  modelSelect.addEventListener('change', ()=>{
    runtimeState.model = modelSelect.value;
    persistRuntimeSelection();
    updateGenerateAvailability();
  });
  if(saved && runtimeState.providers.some(provider=>provider.id === saved.provider)){
    runtimeState.provider = saved.provider;
    providerSelect.value = saved.provider;
    populateModels(saved.model);
  }
}

async function loadRuntimeCapabilities(){
  try{
    const response = await fetch('/api/capabilities');
    if(!response.ok) throw new Error('Capabilities unavailable.');
    const capabilities = await response.json();
    if(typeof document === 'undefined') return;
    runtimeState.mode = capabilities.mode;
    runtimeState.capabilities = capabilities;
    runtimeState.usage = capabilities.usage;
    runtimeState.providers = capabilities.providers || [];
    runtimeState.loaded = true;
    renderRuntimeStatus(capabilities);
  }catch(error){
    if(typeof document === 'undefined') return;
    document.querySelector('[data-role="runtime-status"]').innerHTML = '<strong>CONNECTION UNAVAILABLE</strong>';
  }
  if(typeof document === 'undefined') return;
  updateGenerateAvailability();
}

function hasGeneratedResults(){
  return document.querySelectorAll('.card').length > 0;
}

function updateClearVisibility(){
  const hasDraft = document.getElementById('draft').value.length > 0;
  document.getElementById('clearDraft').hidden = !hasDraft && !hasGeneratedResults();
}

function workspaceSnapshot(){
  const platforms = {};
  document.querySelectorAll('.card').forEach(card=>{
    const get = role => { const el = card.querySelector('[data-role="'+role+'"]'); return el ? el.value : ''; };
    const value = {
      body: get('body'),
      tags: card._getTags ? card._getTags().join(', ') : '',
      exposure_tip_zh: card._tipZh || '',
      exposure_tip_en: card._tipEn || '',
    };
    if(card.querySelector('[data-role="title"]')) value.title = get('title');
    if(card.querySelector('[data-role="subtitle"]')) value.subtitle = get('subtitle');
    if(card.querySelector('[data-role="preview"]')) value.preview_text = get('preview');
    if(card.querySelector('[data-role="note"]')) value.note = get('note');
    platforms[card.dataset.platform] = value;
  });
  const active = document.querySelector('.rtab.active');
  return { draft: document.getElementById('draft').value, platforms, activePlatform: active ? active.dataset.platform : null };
}

function persistWorkspace(){
  const state = workspaceSnapshot();
  if(!state.draft && Object.keys(state.platforms).length === 0){
    localStorage.removeItem(WORKSPACE_STORAGE_KEY);
    return;
  }
  localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(state));
}

function resetGeneratedResults(){
  document.getElementById('results').innerHTML = '';
  renderGhostTabs();
  document.getElementById('emptyState').style.display = 'none';
}

function clearWorkspace(){
  document.getElementById('draft').value = '';
  resetGeneratedResults();
  localStorage.removeItem(WORKSPACE_STORAGE_KEY);
  updateClearVisibility();
  document.getElementById('draft').focus();
}

/* Strips whitespace and punctuation a hashtag can't contain (spaces, hyphens,
   apostrophes, etc.) while preserving letters/numbers in any script, including
   Chinese, so 小红书 tags survive intact. */
function sanitizeHashtag(tag){
  return tag.replace(/\s+/g, '').replace(/[^\p{L}\p{N}_]/gu, '');
}

function normalizeHashtag(tag){
  const label = sanitizeHashtag(String(tag || '').trim().replace(/^#+/, ''));
  return label ? '#' + label : '';
}

function normalizeHashtags(tags){
  const seen = new Set();
  return tags.reduce((normalized, tag)=>{
    const hashtag = normalizeHashtag(tag);
    const key = hashtag.toLocaleLowerCase();
    if(hashtag && !seen.has(key)){
      seen.add(key);
      normalized.push(hashtag);
    }
    return normalized;
  }, []);
}

function contentCopyLabel(platform){
  if(lang === 'zh'){
    if(platform === 'substack') return '复制文章';
    if(platform === 'medium') return '复制故事';
    return '复制文案';
  }
  if(platform === 'substack') return 'COPY ARTICLE';
  if(platform === 'medium') return 'COPY STORY';
  return 'COPY TEXT';
}

function tagsCopyLabel(){
  return lang === 'zh' ? '复制话题标签' : 'COPY HASHTAGS';
}

function copyAccessibleLabel(platform, kind){
  const name = PLATFORM_META[platform].label;
  if(lang === 'zh'){
    if(kind === 'content'){
      const noun = platform === 'substack' ? '文章' : platform === 'medium' ? '故事' : '文案';
      return `复制 ${name} ${noun}`;
    }
    return `复制 ${name} 话题标签`;
  }
  if(kind === 'content'){
    const noun = platform === 'substack' ? 'article' : platform === 'medium' ? 'story' : 'text';
    return `Copy ${name} ${noun}`;
  }
  return `Copy ${name} hashtags`;
}

function updateCopyControlLabel(button){
  const card = button.closest('.card');
  if(!card) return;
  const kind = button.dataset.copyKind;
  button.textContent = kind === 'content' ? contentCopyLabel(card.dataset.platform) : tagsCopyLabel(card.dataset.platform);
  button.setAttribute('aria-label', copyAccessibleLabel(card.dataset.platform, kind));
}

function formatHashtagsForCopy(tags){
  return normalizeHashtags(tags).join(' ');
}

function showCopyFeedback(button, succeeded){
  button.classList.toggle('copy-error', !succeeded);
  button.textContent = succeeded ? t('copied') : t('copyFail');
  window.setTimeout(()=>{
    button.classList.remove('copy-error');
    updateCopyControlLabel(button);
  }, succeeded ? 1500 : 2000);
}

function formatMeasure(measure, platform){
  if(measure.limit == null) return measure.length + t('chars');
  const unit = platform === 'twitter' ? '' : lang === 'zh' && platform === 'xhs' ? ' 字' : lang === 'zh' ? ' 字符' : ' chars';
  let text = measure.length + ' / ' + measure.limit + unit;
  if(!measure.valid) text += ' · ' + (lang === 'zh' ? t('exceeded') + ' ' + measure.overBy : measure.overBy + ' ' + t('exceeded'));
  else if(measure.nearLimit) text += ' · ' + (lang === 'zh' ? t('remaining') + ' ' + measure.remaining : measure.remaining + ' ' + t('remaining'));
  return text;
}

/* On-page-only reference text for platforms that don't take inline hashtags —
   never appended to the copied output, just shown next to the chip editor. */
function chipHintText(platform, platformLabel){
  if(platform === 'xhs') return t('xhsTopicNote');
  return lang === 'zh'
    ? `可单独复制并添加到${platformLabel}的标签字段`
    : `Copy separately into ${platformLabel}'s tag field`;
}

function renderGhostTabs(){
  const tabsEl = document.getElementById('resultsTabs');
  tabsEl.innerHTML = '';
  Object.keys(PLATFORM_META).forEach(key=>{
    const meta = PLATFORM_META[key];
    const tab = document.createElement('button');
    tab.className = 'rtab ghost';
    tab.innerHTML = iconHTML(meta.icon) + meta.label;
    tabsEl.appendChild(tab);
  });
}

/* ================= platform toggle sync ================= */
document.querySelectorAll('.plat-toggle input').forEach(cb=>{
  cb.addEventListener('change', ()=>{
    cb.closest('.plat-toggle').classList.toggle('on', cb.checked);
    const card = document.querySelector('.card[data-platform="'+cb.value+'"]');
    const tab = document.querySelector('.rtab[data-platform="'+cb.value+'"]');
    if(tab) tab.style.display = cb.checked ? '' : 'none';
    if(card && !cb.checked) card.classList.remove('active');
    if(!cb.checked && tab && tab.classList.contains('active')){
      tab.classList.remove('active');
      const firstVisible = Array.from(document.querySelectorAll('.rtab:not(.ghost)')).find(x=>x.style.display !== 'none');
      if(firstVisible) firstVisible.click();
    }
  });
});

/* ================= render ================= */
function renderCard(key, p){
  const meta = PLATFORM_META[key];
  const resultsEl = document.getElementById('results');
  const tabsEl = document.getElementById('resultsTabs');
  const rawTags = Array.isArray(p.tags) ? p.tags : String(p.tags || '').split(/[\n,、]+/);
  const initialTags = rawTags.map(x=>String(x).trim()).filter(Boolean).join(', ');
  const limit = meta.limit;

  const oldCard = document.querySelector('.card[data-platform="'+key+'"]');
  const oldTab = document.querySelector('.rtab[data-platform="'+key+'"]');
  if(oldCard) oldCard.remove();

  const tab = document.createElement('button');
  tab.className = 'rtab';
  tab.dataset.platform = key;
  tab.innerHTML = iconHTML(meta.icon) + meta.label;
  if(oldTab) oldTab.replaceWith(tab);
  else tabsEl.appendChild(tab);

  const card = document.createElement('div');
  card.className='card';
  card.dataset.platform = key;
  card.innerHTML = `
    <div class="card-head">
      <div class="length-meters">
        <span class="meter" data-role="meter"></span>
        <span class="combined-meter" data-role="combined-meter"></span>
      </div>
      <button class="utility-copy-btn" type="button" data-role="copy-content" data-copy-kind="content"></button>
    </div>
    <div class="content-divider" data-role="content-divider" aria-hidden="true"></div>
    ${'title' in p ? `<input class="f-title" data-role="title">` : ''}
    ${'subtitle' in p ? `<input class="f-sub" data-role="subtitle">` : ''}
    ${'preview_text' in p ? `<input class="f-preview" data-role="preview">` : ''}
    ${key === 'twitter'
      ? `<div class="thread-editor scrolling-content" data-role="threadeditor"></div><textarea data-role="body" hidden></textarea>`
      : `<textarea class="f-body scrolling-content" data-role="body" rows="1"></textarea>`}
    ${'note' in p ? `<section class="note-block"><label class="note-label" data-role="note-label">${t('substackNote')}</label><textarea class="f-note" data-role="note" rows="1"></textarea></section>` : ''}
    <div class="copy-limit-message" id="copyLimit-${key}" data-role="copy-limit-message" aria-live="polite" hidden></div>
    <div class="chip-editor" data-role="chipeditor">
      <div class="chip-editor-fields" data-role="chipfields">
        <input data-role="chipinput">
      </div>
      <div class="tag-copy-row" hidden>
        <button class="utility-copy-btn" type="button" data-role="copy-tags" data-copy-kind="tags" hidden></button>
      </div>
    </div>
    ${!INLINE_HASHTAG_PLATFORMS.includes(key) || key === 'xhs' ? `<div class="chip-hint" data-role="chiphint"></div>` : ''}
    <div class="tip">
      <div class="tip-icon">✦</div>
      <div class="tip-content">
        <div class="tip-label">${t('tipLabel')}</div>
        <div class="tip-text" data-role="tiptext"></div>
      </div>
    </div>
  `;
  resultsEl.appendChild(card);

  /* 用 .value / .textContent 赋值,不走 innerHTML 模板,避免任何转义/换行问题 */
  const setVal = (role, val) => { const el = card.querySelector('[data-role="'+role+'"]'); if(el) el.value = val; };
  if('title' in p) setVal('title', p.title || '');
  if('subtitle' in p) setVal('subtitle', p.subtitle || '');
  if('preview_text' in p) setVal('preview', p.preview_text || '');
  if('note' in p) setVal('note', p.note || '');
  setVal('body', p.body || '');
  card._tipZh = p.exposure_tip_zh || p.exposure_tip || '';
  card._tipEn = p.exposure_tip_en || p.exposure_tip || '';
  card.querySelector('[data-role="tiptext"]').textContent = lang === 'zh' ? card._tipZh : card._tipEn;
  const chipHintEl = card.querySelector('[data-role="chiphint"]');
  if(chipHintEl) chipHintEl.textContent = chipHintText(key, meta.label);

  const bodyEl = card.querySelector('[data-role="body"]');
  const threadEditor = card.querySelector('[data-role="threadeditor"]');
  const meterEl = card.querySelector('[data-role="meter"]');
  const combinedMeterEl = card.querySelector('[data-role="combined-meter"]');

  /* ---- chip editor ---- */
  const chipEditor = card.querySelector('[data-role="chipeditor"]');
  const chipFields = card.querySelector('[data-role="chipfields"]');
  const chipInput = card.querySelector('[data-role="chipinput"]');
  const tagCopyRow = card.querySelector('.tag-copy-row');
  const contentCopyButton = card.querySelector('[data-role="copy-content"]');
  const tagsCopyButton = card.querySelector('[data-role="copy-tags"]');
  let tags = normalizeHashtags(initialTags.split(','));
  chipInput.placeholder = t('tagPh');
  function renderChips(){
    chipEditor.querySelectorAll('.chip').forEach(c=>c.remove());
    tags.forEach((x,i)=>{
      const chip = document.createElement('span');
      chip.className = 'chip';
      chip.textContent = x;
      const del = document.createElement('span');
      del.className = 'chip-x';
      del.textContent = '×';
      del.addEventListener('click', e=>{ e.stopPropagation(); tags.splice(i,1); renderChips(); persistWorkspace(); });
      chip.appendChild(del);
      chipFields.insertBefore(chip, chipInput);
    });
    tagsCopyButton.hidden = tags.length === 0;
    tagCopyRow.hidden = tags.length === 0;
    if(card._updateMeter) card._updateMeter();
  }
  function commitChip(){
    const v = normalizeHashtag(chipInput.value.replace(/[,、]/g,''));
    if(v && !tags.some(tag => tag.toLocaleLowerCase() === v.toLocaleLowerCase())){
      tags.push(v);
      renderChips();
      persistWorkspace();
    }
    chipInput.value = '';
  }
  chipInput.addEventListener('keydown', e=>{
    if(e.key === 'Enter' || e.key === ','){ e.preventDefault(); commitChip(); }
    else if(e.key === 'Backspace' && chipInput.value === '' && tags.length){ tags.pop(); renderChips(); }
  });
  chipInput.addEventListener('blur', commitChip);
  chipEditor.addEventListener('click', ()=> chipInput.focus());
  renderChips();
  card._getTags = () => tags.slice();
  updateCopyControlLabel(contentCopyButton);
  updateCopyControlLabel(tagsCopyButton);

  const threadEditors = [];
  if(key === 'twitter'){
    PLATFORM_COUNTING.splitThread(bodyEl.value).forEach((text, index)=>{
      const segment = document.createElement('section');
      segment.className = 'thread-segment';
      segment.dataset.role = 'thread-segment';
      segment.innerHTML = `<div class="thread-segment-head"><span data-role="thread-label">${t('post')} ${index + 1}</span>` +
        `<span class="segment-meter" data-role="segment-meter" aria-live="polite"></span></div>` +
        `<textarea class="f-body thread-body" data-role="segment-body" rows="1"></textarea>`;
      const editor = segment.querySelector('[data-role="segment-body"]');
      editor.value = text;
      editor.addEventListener('input', ()=>{
        bodyEl.value = threadEditors.map(item=>item.value).join('\n---\n');
        autoResize(editor);
        updateMeter();
        persistWorkspace();
      });
      threadEditors.push(editor);
      threadEditor.appendChild(segment);
    });
    tab.innerHTML = iconHTML(meta.icon) + meta.label + `<span class="thread-count">${threadEditors.length} ${threadEditors.length === 1 ? t('post') : t('posts')}</span>`;
  }

  function autoResize(el){ el.style.height='auto'; el.style.height=(el.scrollHeight+2)+'px'; }
  function updateMeter(){
    const hashtags = tags.join(' ');
    const copyMessage = card.querySelector('[data-role="copy-limit-message"]');
    let textValid = true;
    let invalidDetail = '';
    if(key === 'twitter'){
      const thread = PLATFORM_COUNTING.measureThread(bodyEl.value, hashtags);
      thread.segments.forEach((measure, index)=>{
        const el = card.querySelectorAll('[data-role="segment-meter"]')[index];
        el.textContent = formatMeasure(measure, key);
        el.setAttribute('aria-label', `${t('post')} ${index + 1}: ${formatMeasure(measure, key)}`);
        el.classList.toggle('near', measure.nearLimit && measure.valid);
        el.classList.toggle('over', !measure.valid);
        if(!measure.valid) invalidDetail = `${t('post')} ${index + 1}: ${formatMeasure(measure, key)}`;
      });
      textValid = thread.valid;
      meterEl.textContent = `${thread.segments.length} ${thread.segments.length === 1 ? t('post') : t('posts')}`;
      const combined = thread.combinedSegments.at(-1);
      combinedMeterEl.hidden = false;
      combinedMeterEl.textContent = `${t('withHashtags')} (${t('post')} ${thread.hashtagSegment}): ${formatMeasure(combined, key)}`;
      combinedMeterEl.setAttribute('aria-label', combinedMeterEl.textContent);
      combinedMeterEl.classList.toggle('over', !combined.valid);
    }else{
      const measure = PLATFORM_COUNTING.measureText(key, bodyEl.value);
      textValid = measure.valid;
      meterEl.textContent = formatMeasure(measure, key);
      meterEl.setAttribute('aria-label', `${meta.label}: ${formatMeasure(measure, key)}`);
      meterEl.classList.toggle('near', measure.nearLimit && measure.valid);
      meterEl.classList.toggle('over', !measure.valid);
      if(!measure.valid) invalidDetail = formatMeasure(measure, key);
      if(limit){
        const combinedText = bodyEl.value + (hashtags ? ' ' + hashtags : '');
        const combined = PLATFORM_COUNTING.measureText(key, combinedText);
        combinedMeterEl.hidden = false;
        combinedMeterEl.textContent = `${t('withHashtags')}: ${formatMeasure(combined, key)}`;
        combinedMeterEl.setAttribute('aria-label', combinedMeterEl.textContent);
        combinedMeterEl.classList.toggle('over', !combined.valid);
      }else{
        combinedMeterEl.hidden = true;
      }
    }
    contentCopyButton.disabled = !textValid;
    contentCopyButton.setAttribute('aria-disabled', String(!textValid));
    if(textValid) contentCopyButton.removeAttribute('aria-describedby');
    else contentCopyButton.setAttribute('aria-describedby', `copyLimit-${key}`);
    copyMessage.hidden = textValid;
    copyMessage.textContent = textValid ? '' : `${invalidDetail}. ${t('copyLimitBlocked')}`;
  }
  card._updateMeter = updateMeter;
  if(key !== 'twitter') bodyEl.addEventListener('input', ()=>{
    updateMeter();
    persistWorkspace();
  });
  card.querySelectorAll('.f-title,.f-sub,.f-preview,.f-note').forEach(el=> el.addEventListener('input', persistWorkspace));

  tab.addEventListener('click', ()=>{
    document.querySelectorAll('.rtab').forEach(x=>x.classList.remove('active'));
    document.querySelectorAll('.card').forEach(x=>x.classList.remove('active'));
    tab.classList.add('active');
    card.classList.add('active');
    if(key === 'twitter') threadEditors.forEach(autoResize);
    updateMeter();
    persistWorkspace();
  });
  if(!tabsEl.querySelector('.rtab.active')){
    tab.click();
  } else {
    updateMeter();
  }

  contentCopyButton.addEventListener('click', ()=>{
    const get = role => { const el = card.querySelector('[data-role="'+role+'"]'); return el ? el.value : ''; };
    commitChip();
    const parts = [get('title'), get('subtitle'), get('preview'), get('body'), get('note')];
    const full = parts.filter(Boolean).join('\n\n');
    copyText(full).then(()=>{
      showCopyFeedback(contentCopyButton, true);
    }).catch(()=>{
      showCopyFeedback(contentCopyButton, false);
    });
  });
  tagsCopyButton.addEventListener('click', e=>{
    e.stopPropagation();
    commitChip();
    const formatted = formatHashtagsForCopy(tags);
    if(!formatted) return;
    copyText(formatted).then(()=>{
      showCopyFeedback(tagsCopyButton, true);
    }).catch(()=>{
      showCopyFeedback(tagsCopyButton, false);
    });
  });
}

/* ================= utils ================= */
function copyText(text){
  if(navigator.clipboard && window.isSecureContext){
    return navigator.clipboard.writeText(text).catch(()=> fallbackCopy(text));
  }
  return fallbackCopy(text);
}
function fallbackCopy(text){
  return new Promise((resolve, reject)=>{
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.top = '0'; ta.style.left = '0'; ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.focus(); ta.select();
    try{
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      ok ? resolve() : reject(new Error('execCommand failed'));
    }catch(e){
      document.body.removeChild(ta);
      reject(e);
    }
  });
}
/* ================= generate ================= */
async function callGenerate(draft, platform, requestId, options){
  const request = options || { action: 'generate' };
  const target = runtimeState.mode === 'local'
    ? { provider:runtimeState.provider, model:runtimeState.model }
    : {};
  const res = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ draft, platform, requestId, ...target, ...request }),
  });
  let payload = null;
  try{ payload = await res.json(); }catch(e){ /* non-JSON proxy error */ }
  if(!res.ok){
    const type = payload && payload.error && payload.error.type;
    const message = (payload && payload.error && payload.error.message) || (res.status + ' ' + res.statusText);
    const err = new Error(message);
    err.type = type;
    err.status = res.status;
    throw err;
  }
  if(!payload || payload.platform !== platform || !['ready','needs_repair'].includes(payload.status)){
    const err = new Error('Invalid platform response.');
    err.type = 'invalid_response';
    throw err;
  }
  return payload;
}

function isTransientGenerationError(error){
  return error && (error.status === 429 || error.status >= 500 ||
    ['timeout','network_error','api_error','overloaded_error','rate_limit_error','upstream_error'].includes(error.type));
}

async function callWithPlatformRetry(draft, platform, requestId, options){
  let lastError;
  for(let retryAttempt = 0; retryAttempt <= 2; retryAttempt++){
    if(retryAttempt > 0){
      setJobState(platform, 'retrying', '', retryAttempt);
      await new Promise(resolve=>setTimeout(resolve, 250 * (2 ** (retryAttempt - 1))));
    }
    try{
      return await callGenerate(draft, platform, requestId, options);
    }catch(error){
      lastError = error;
      if(!isTransientGenerationError(error)) throw error;
    }
  }
  throw lastError;
}

async function runWithConcurrency(items, limit, task){
  let nextIndex = 0;
  async function worker(){
    while(nextIndex < items.length){
      const item = items[nextIndex++];
      try{ await task(item); }catch(error){ /* item owns its failed state; continue queue */ }
    }
  }
  return Promise.allSettled(Array.from({ length: Math.min(limit, items.length) }, worker));
}

function statusText(state, attempt){
  const text = t({ generating:'statusGenerating', validating:'statusValidating', adjusting:'statusAdjusting', retrying:'statusRetrying', failed:'statusFailed' }[state]);
  if(state === 'retrying' || state === 'adjusting'){
    return text + '… (' + (attempt || '1') + '/2)';
  }
  return state === 'failed' ? text : text + '…';
}

function updateJobText(job){
  const state = job.dataset.state;
  job.querySelector('[data-role="job-status"]').textContent = statusText(state, job.dataset.attempt);
  const retry = job.querySelector('[data-role="retry-platform"]');
  retry.textContent = t('retryPlatform');
  retry.setAttribute('aria-label', t('retryPlatform') + ' ' + PLATFORM_META[job.dataset.platform].label);
}

function createPlatformJobs(platforms){
  const tabs = document.getElementById('resultsTabs');
  platforms.forEach(platform=>{
    const job = document.createElement('div');
    job.className = 'rtab processing';
    job.dataset.platform = platform;
    job.dataset.state = 'generating';
    job.setAttribute('aria-busy', 'true');
    job.innerHTML = `${iconHTML(PLATFORM_META[platform].icon)}` +
      `<span class="job-status" data-role="job-status" aria-live="polite"></span>` +
      `<span class="job-error" data-role="job-error"></span>` +
      `<button class="job-retry" type="button" data-role="retry-platform" hidden></button>`;
    updateJobText(job);
    tabs.appendChild(job);
  });
}

function setJobState(platform, state, message, attempt){
  const job = document.querySelector('.rtab[data-platform="'+platform+'"][data-state]');
  if(!job) return;
  job.dataset.state = state;
  if(attempt) job.dataset.attempt = String(attempt);
  else delete job.dataset.attempt;
  job.classList.toggle('processing', state !== 'failed');
  job.classList.toggle('failed', state === 'failed');
  if(state === 'failed') job.removeAttribute('aria-busy');
  else job.setAttribute('aria-busy', 'true');
  job.querySelector('[data-role="job-error"]').textContent = message || '';
  job.querySelector('[data-role="retry-platform"]').hidden = state !== 'failed';
  updateJobText(job);
}

async function runPlatformJob(draft, platform, requestId, isManualRetry){
  setJobState(platform, isManualRetry ? 'retrying' : 'generating');
  try{
    let payload = await callWithPlatformRetry(draft, platform, requestId, { action: 'generate' });
    for(let repairAttempt = 1; payload.status === 'needs_repair' && repairAttempt <= 2; repairAttempt++){
      setJobState(platform, 'adjusting', '', repairAttempt);
      payload = await callWithPlatformRetry(draft, platform, requestId, {
        action: 'repair',
        repairAttempt,
        invalidResponse: payload.invalidResponse,
      });
    }
    if(payload.status !== 'ready' || !payload.result) throw new Error('Length adjustment did not produce a valid result.');
    setJobState(platform, 'validating');
    await new Promise(resolve=>{
      if(typeof requestAnimationFrame === 'function') requestAnimationFrame(()=>resolve());
      else setTimeout(resolve, 0);
    });
    renderCard(platform, payload.result);
    setJobState(platform, 'ready');
    updateClearVisibility();
    persistWorkspace();
    return payload;
  }catch(e){
    setJobState(platform, 'failed', e.message);
    throw e;
  }
}

/* classic animated ellipsis on the button label while generating —
   no cycling status phrases, just "Generating" + "." "." "." looping */
let generatingInterval = null;
function startGeneratingAnimation(btn){
  let dots = 0;
  btn.textContent = t('generating');
  generatingInterval = setInterval(()=>{
    dots = (dots % 3) + 1;
    btn.textContent = t('generating') + '.'.repeat(dots);
  }, 450);
}
function stopGeneratingAnimation(btn){
  if(generatingInterval){ clearInterval(generatingInterval); generatingInterval = null; }
  btn.textContent = t('go');
}

document.getElementById('go').addEventListener('click', async ()=>{
  const draft = document.getElementById('draft').value.trim();
  const errEl = document.getElementById('err');
  const loadingEl = document.getElementById('loading');
  const btn = document.getElementById('go');
  errEl.style.display='none';

  const selected = Array.from(document.querySelectorAll('.plat-toggle input:checked')).map(cb=>cb.value);
  if(!draft){ errEl.textContent=t('errDraft'); errEl.style.display='block'; return; }
  if(selected.length===0){ errEl.textContent=t('errPlat'); errEl.style.display='block'; return; }

  btn.disabled = true;
  loadingEl.style.display='block';
  startGeneratingAnimation(btn);

  document.getElementById('results').innerHTML='';
  document.getElementById('resultsTabs').innerHTML='';
  document.getElementById('emptyState').style.display = 'none';
  createPlatformJobs(selected);
  const requestId = (crypto.randomUUID && crypto.randomUUID()) || (Date.now() + '-' + Math.random());
  const retry = async platform=>{
    try{ await runPlatformJob(draft, platform, requestId, true); }catch(e){ /* job shows error */ }
  };
  document.querySelectorAll('[data-role="retry-platform"]').forEach(button=>{
    button.addEventListener('click', ()=> retry(button.closest('.rtab').dataset.platform));
  });

  try{
    await runWithConcurrency(selected, 2, platform=>runPlatformJob(draft, platform, requestId, false));
  }finally{
    loadingEl.style.display='none';
    stopGeneratingAnimation(btn);
    if(runtimeState.mode === 'trial' && runtimeState.usage && runtimeState.usage.remaining > 0){
      runtimeState.usage.remaining -= 1;
      runtimeState.usage.used += 1;
      renderRuntimeStatus({ mode:'trial', usage:runtimeState.usage, githubUrl:'https://github.com/JIEDIT/draft-everywhere' });
    }
    updateGenerateAvailability();
  }
});

/* ================= init ================= */
renderGhostTabs();
applyLang();
loadRuntimeCapabilities();

const draftEl = document.getElementById('draft');
const clearDraftBtn = document.getElementById('clearDraft');
const clearDraftDialog = document.getElementById('clearDraftDialog');

function openClearDialog(){
  if(typeof clearDraftDialog.showModal === 'function') clearDraftDialog.showModal();
  else clearDraftDialog.setAttribute('open', '');
}
function closeClearDialog(){
  if(typeof clearDraftDialog.close === 'function') clearDraftDialog.close();
  else clearDraftDialog.removeAttribute('open');
}

draftEl.addEventListener('input', ()=>{
  if(draftEl.value === ''){
    resetGeneratedResults();
    localStorage.removeItem(WORKSPACE_STORAGE_KEY);
  } else {
    persistWorkspace();
  }
  updateClearVisibility();
});

clearDraftBtn.addEventListener('click', ()=>{
  if(hasGeneratedResults()) openClearDialog();
  else clearWorkspace();
});
document.getElementById('cancelClearDraft').addEventListener('click', closeClearDialog);
document.getElementById('confirmClearDraft').addEventListener('click', ()=>{
  closeClearDialog();
  clearWorkspace();
});

try{
  const saved = JSON.parse(localStorage.getItem(WORKSPACE_STORAGE_KEY) || 'null');
  if(saved && typeof saved.draft === 'string' && saved.draft){
    draftEl.value = saved.draft;
    document.getElementById('results').innerHTML = '';
    document.getElementById('resultsTabs').innerHTML = '';
    Object.keys(saved.platforms || {}).forEach(key=>{
      if(PLATFORM_META[key]) renderCard(key, saved.platforms[key]);
    });
    if(saved.activePlatform){
      const activeTab = document.querySelector('.rtab[data-platform="'+saved.activePlatform+'"]');
      if(activeTab) activeTab.click();
    }
  }
}catch(e){
  localStorage.removeItem(WORKSPACE_STORAGE_KEY);
}
updateClearVisibility();
