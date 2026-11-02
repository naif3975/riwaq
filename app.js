(() => {
  'use strict';
  const STORAGE_KEY = 'riwaq-library-v1';
  const safeDefault = { siteName:'رِواق', subtitle:'رفوف تجمع ما قرأت، وهوامش تحفظ ما شعرت، وحكايات تستحق أن تُروى مرة أخرى.', profileUrl:'', widgets:{grid:'',custom:'',updates:''}, books:[] };
  const clone = (v) => JSON.parse(JSON.stringify(v));
  const defaults = clone(window.RIWAQ_CONFIG || safeDefault);
  let data = clone(defaults);
  try { const saved = localStorage.getItem(STORAGE_KEY); if(saved) data = normalizeConfig(JSON.parse(saved)); } catch(err) { console.warn('تعذّر فتح التخزين المحلي؛ ما زال الموقع يعمل.', err); }
  const $ = (selector, scope=document) => scope.querySelector(selector);
  const $$ = (selector, scope=document) => [...scope.querySelectorAll(selector)];
  let activeShelf='all'; let activeGenre='all'; let searchTerm=''; let activeWidget='grid'; let toastTimer;
  const labels = {read:'قرأتُها','currently-reading':'أقرأ حاليًا','to-read':'أريد قراءتها'};
  const arNum = (n) => String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[Number(d)]);
  const escapeHtml = (v='') => String(v).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const safeCover = (value) => {
    if(typeof value !== 'string') return '';
    const v=value.trim();
    if(/^(https:\/\/[^\s]+|assets\/[a-zA-Z0-9_./-]+)$/i.test(v)) return v;
    return '';
  };
  const safeProfile = (value) => {
    try { const url = new URL(value); return url.protocol==='https:' && /(^|\.)goodreads\.com$/i.test(url.hostname) ? url.toString() : ''; }
    catch { return ''; }
  };
  function normalizeConfig(raw) {
    const src = (raw && typeof raw==='object') ? raw : {};
    const widgets = (src.widgets && typeof src.widgets==='object') ? src.widgets : {};
    const books = Array.isArray(src.books) ? src.books.slice(0,500) : [];
    return {
      siteName: String(src.siteName || 'رِواق').slice(0,36),
      subtitle: String(src.subtitle || safeDefault.subtitle).slice(0,250),
      profileUrl: safeProfile(src.profileUrl || ''),
      widgets: {grid:String(widgets.grid||'').slice(0,150000),custom:String(widgets.custom||'').slice(0,150000),updates:String(widgets.updates||'').slice(0,150000)},
      books: books.map((b,i) => ({id:String(b.id||`item-${i}`).slice(0,100),title:String(b.title||'كتاب بلا عنوان').slice(0,120),author:String(b.author||'').slice(0,120),genre:String(b.genre||'غير مصنف').slice(0,60),shelf:labels[b.shelf]?b.shelf:'read',rating:Math.max(0,Math.min(5,Number(b.rating)||0)),cover:safeCover(b.cover),review:String(b.review||'').slice(0,3000)}))
    };
  }
  data = normalizeConfig(data);
  function persist() { try{localStorage.setItem(STORAGE_KEY,JSON.stringify(data)); return true;}catch(err){console.warn(err);toast('تعذر الحفظ المحلي. نزّل ملف الإعدادات للاحتفاظ بالتعديلات.');return false;} }
  function toast(message){const el=$('#toast');el.textContent=message;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),3600);}
  function imageHTML(book,extra='') {const cover=safeCover(book.cover);return cover?`<img ${extra} src="${escapeHtml(cover)}" alt="غلاف ${escapeHtml(book.title)}" loading="lazy" />`:`<div class="fallback-cover" role="img" aria-label="غلاف تخيلي لكتاب ${escapeHtml(book.title)}"><span>${escapeHtml(book.title)}</span></div>`;}
  function attachImageFallback(root){$$('img',root).forEach(img=>img.addEventListener('error',()=>{const book=data.books.find(b=>b.cover===img.getAttribute('src'));const fallback=document.createElement('div');fallback.className='fallback-cover';fallback.textContent=(book?.title||'كتاب');img.replaceWith(fallback);},{once:true}));}
  function stars(rating){return rating?`<div class="book-stars" aria-label="التقييم: ${rating} من 5">${'★'.repeat(rating)}<span class="empty">${'☆'.repeat(5-rating)}</span></div>`:`<div class="book-stars unrated">لم يُقيّم بعد</div>`;}
  function syncBrand(){
    $('#brand-name').textContent=data.siteName;$('#footer-brand').textContent=data.siteName;document.title=`${data.siteName} | مكتبة شخصية`;
    $('#hero-desc').textContent=data.subtitle;
    $('#profile-link').href=data.profileUrl||'https://www.goodreads.com/';
    $('#year').textContent=new Date().getFullYear();
    $('#stats-books').textContent=arNum(data.books.length).padStart(2,'٠');
    $('#stats-genres').textContent=arNum(new Set(data.books.map(b=>b.genre)).size).padStart(2,'٠');
    $('#stats-reviews').textContent=arNum(data.books.filter(b=>b.review.trim()).length).padStart(2,'٠');
  }
  function renderGenreOptions(){
    const select=$('#genre-filter'); const previous=activeGenre;
    const genres=[...new Set(data.books.map(b=>b.genre||'غير مصنف'))].sort((a,b)=>a.localeCompare(b,'ar'));
    select.innerHTML='<option value="all">كل التصنيفات</option>';
    genres.forEach(g=>{const opt=document.createElement('option');opt.value=g;opt.textContent=g;select.appendChild(opt);});
    activeGenre=genres.includes(previous)?previous:'all'; select.value=activeGenre;
  }
  function renderBooks(){
    const list=data.books.filter(b=>(activeShelf==='all'||b.shelf===activeShelf)&&(activeGenre==='all'||b.genre===activeGenre)&&(!searchTerm||[b.title,b.author,b.genre,b.review].join(' ').toLocaleLowerCase().includes(searchTerm)));
    $('#book-count').textContent=`${arNum(list.length)} من ${arNum(data.books.length)} كتاب على الرفوف`;
    const container=$('#books-grid');
    container.innerHTML=list.length?list.map(book=>`<article class="book-card"><button type="button" class="book-cover-button" data-view="${escapeHtml(book.id)}" aria-label="تفاصيل كتاب ${escapeHtml(book.title)}"><div class="book-art">${book.shelf!=='read'?`<span class="book-status">${labels[book.shelf]}</span>`:''}${imageHTML(book)}</div></button><div class="book-info"><div class="book-genre">${escapeHtml(book.genre)}</div><h3 class="book-title"><button type="button" data-view="${escapeHtml(book.id)}">${escapeHtml(book.title)}</button></h3><p class="book-author">${escapeHtml(book.author)}</p>${stars(book.rating)}</div></article>`).join(''):`<div class="empty-state"><strong>هذا الرف ينتظر حكايات جديدة</strong><p>لا توجد كتب مطابقة لهذا الاختيار بعد.</p><button class="outlined-action" id="empty-add">أضف أول كتاب</button></div>`;
    attachImageFallback(container);
  }
  function renderJournal(){
    const reviews=data.books.filter(b=>b.review.trim()).slice(0,5);
    const cards=reviews.map((b)=>`<article class="journal-card"><span class="journal-category">${escapeHtml(b.genre)} · ${escapeHtml(b.author)}</span><h3>${escapeHtml(b.title)}</h3><p>${escapeHtml(b.review.slice(0,185))}${b.review.length>185?'…':''}</p><div class="journal-meta"><span>${arNum(b.rating)} / ٥ ★</span><button type="button" data-view="${escapeHtml(b.id)}">اقرأ المراجعة ←</button></div></article>`).join('');
    const placeholders=[
      ['صفحة جديدة تنتظر قلمك','دوّن ما بقي معك من أحداث الكتاب وأفكاره، ولو في جملة واحدة.','مفكرة القراءة'],
      ['حين تنتهي الرواية…','ما الشخصية التي ظلّت تذكرك بنفسها؟ وما الفكرة التي تستحق العودة إليها؟','أسئلة للقراءة'],
      ['بداية حكاية أخرى','يمكنك فتح أي كتاب من رفوفك وإضافة مراجعتك، لتظهر هنا تلقائيًا.','أضف انطباعك']
    ];
    const needed=Math.max(0,3-reviews.length);
    const filler=placeholders.slice(0,needed).map((item,i)=>`<article class="journal-card ${i===0&&reviews.length===0?'journal-prompt':''}"><span class="journal-category">${item[2]}</span><h3>${item[0]}</h3><p>${item[1]}</p><div class="journal-meta"><span>مساحة لكتاباتك الشخصية</span><button type="button" data-add-book="true">ابدأ التدوين ←</button></div></article>`).join('');
    $('#journal-grid').innerHTML=cards+filler;
  }
  function renderWidget(){
    const code=data.widgets[activeWidget]||'';const stage=$('#widget-stage');
    $$('.widget-tab').forEach(el=>{const current=el.dataset.widget===activeWidget;el.classList.toggle('active',current);el.setAttribute('aria-selected',String(current));});
    if(!code.trim()){
      const name={grid:'Grid Widget',custom:'Custom Widget',updates:'Updates Widget'}[activeWidget];
      stage.innerHTML=`<div class="widget-placeholder"><div class="placeholder-covers" aria-hidden="true"><span></span><span></span><span></span><span></span></div><h3>رفّك ينتظر أن يُفتح</h3><p>أضف كود ${name} من Goodreads ليظهر محتواه الحقيقي في هذا المكان.</p><button type="button" id="placeholder-settings">إضافة كود الويدجت ←</button></div>`;
    } else {
      stage.textContent='';
      const frame=document.createElement('iframe');frame.className='widget-frame';frame.title='محتوى Goodreads: '+({grid:'شبكة الكتب',custom:'قائمة الكتب',updates:'آخر التحديثات'}[activeWidget]);frame.setAttribute('sandbox','allow-scripts allow-popups allow-popups-to-escape-sandbox');frame.setAttribute('referrerpolicy','strict-origin-when-cross-origin');frame.loading='lazy';
      frame.srcdoc=`<!doctype html><html lang="ar"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><base target="_blank"><style>body{margin:10px;font-family:Tahoma,Arial,sans-serif;overflow-wrap:anywhere}img{max-width:100%;height:auto}*{box-sizing:border-box}</style></head><body>${code}</body></html>`;
      stage.appendChild(frame);
    }
  }
  function renderAll(){syncBrand();renderGenreOptions();renderBooks();renderJournal();renderWidget();}
  function openDialog(id){const dlg=$('#'+id);if(dlg&&!dlg.open){dlg.showModal();document.body.classList.add('dialog-open');}}
  function closeDialog(id){const dlg=$('#'+id);if(dlg?.open)dlg.close();}
  $$('.modal').forEach(dlg=>{
    dlg.addEventListener('close',()=>{if(!$$('.modal').some(d=>d.open))document.body.classList.remove('dialog-open');});
    dlg.addEventListener('click',e=>{if(e.target===dlg)dlg.close();});
  });
  document.addEventListener('click',(e)=>{
    const closer=e.target.closest('[data-close]');if(closer)closeDialog(closer.dataset.close);
    const bookBtn=e.target.closest('[data-view]');if(bookBtn)openBookDetail(bookBtn.dataset.view);
    if(e.target.closest('[data-add-book]')||e.target.closest('#empty-add'))openBookEditor();
  });
  function openBookEditor(id=''){
    const b=id?data.books.find(book=>book.id===id):null;
    $('#book-dialog-heading').textContent=b?'تعديل كتاب':'إضافة كتاب';$('#book-id').value=b?.id||'';$('#book-title').value=b?.title||'';$('#book-author').value=b?.author||'';$('#book-genre').value=b?.genre||'';$('#book-shelf').value=b?.shelf||'read';$('#book-rating').value=String(b?.rating||0);$('#book-cover').value=b?.cover||'';$('#book-review').value=b?.review||'';openDialog('book-dialog');
  }
  function openBookDetail(id){
    const b=data.books.find(book=>book.id===id);if(!b)return;
    const body=$('#detail-content');body.innerHTML=`<div class="detail-layout"><div class="detail-image">${imageHTML(b,'class="detail-cover"')}</div><div><div class="detail-kicker">${escapeHtml(b.genre)} · ${labels[b.shelf]}</div><h2 id="detail-title">${escapeHtml(b.title)}</h2><p class="detail-author">تأليف ${escapeHtml(b.author)}</p>${stars(b.rating)}<div class="detail-review">${b.review.trim()?escapeHtml(b.review):'لم تُكتب مراجعة لهذا الكتاب بعد. يمكنك إضافة انطباعك من زر التعديل.'}</div><div class="detail-edit-actions"><button class="outlined-action" type="button" id="edit-selected">تعديل الكتاب / المراجعة</button><button class="outlined-action danger" type="button" id="delete-selected">حذف الكتاب</button></div></div></div>`;
    attachImageFallback(body);
    $('#edit-selected').onclick=()=>{closeDialog('detail-dialog');openBookEditor(id);};
    $('#delete-selected').onclick=()=>{if(confirm(`هل تريد حذف «${b.title}» من مكتبتك المحلية؟`)){data.books=data.books.filter(x=>x.id!==id);persist();renderAll();closeDialog('detail-dialog');toast('تم حذف الكتاب من هذه النسخة المحلية.');}};
    openDialog('detail-dialog');
  }
  $('#add-book').addEventListener('click',()=>openBookEditor());
  $('#book-form').addEventListener('submit',(e)=>{
    e.preventDefault();const id=$('#book-id').value;const item={id:id||'book-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,6),title:$('#book-title').value.trim(),author:$('#book-author').value.trim(),genre:$('#book-genre').value.trim()||'غير مصنف',shelf:$('#book-shelf').value,rating:Number($('#book-rating').value),cover:safeCover($('#book-cover').value),review:$('#book-review').value.trim()};
    if(!item.title||!item.author){toast('الرجاء كتابة العنوان واسم المؤلف.');return;}
    const found=data.books.findIndex(book=>book.id===id);if(found>=0)data.books[found]=item;else data.books.unshift(item);
    persist();activeShelf='all';activeGenre='all';searchTerm='';$('#book-search').value='';$$('.filter').forEach(btn=>{btn.classList.toggle('active',btn.dataset.filter==='all');btn.setAttribute('aria-pressed',String(btn.dataset.filter==='all'));});renderAll();closeDialog('book-dialog');toast(found>=0?'تم حفظ تعديل الكتاب ومراجعته.':'أُضيف الكتاب إلى رفوف مكتبتك.');
  });
  $('#shelf-filters').addEventListener('click',e=>{const el=e.target.closest('button[data-filter]');if(!el)return;activeShelf=el.dataset.filter;$$('.filter').forEach(btn=>{const state=btn===el;btn.classList.toggle('active',state);btn.setAttribute('aria-pressed',String(state));});renderBooks();});
  $('#genre-filter').addEventListener('change',e=>{activeGenre=e.target.value;renderBooks();});
  $('#book-search').addEventListener('input',e=>{searchTerm=e.target.value.trim().toLocaleLowerCase();renderBooks();});
  $('#widget-tabs').addEventListener('click',e=>{const el=e.target.closest('[data-widget]');if(!el)return;activeWidget=el.dataset.widget;renderWidget();});
  function openSettings(){
    $('#settings-name').value=data.siteName;$('#settings-subtitle').value=data.subtitle;$('#settings-profile').value=data.profileUrl;
    $('#widget-grid-code').value=data.widgets.grid;$('#widget-custom-code').value=data.widgets.custom;$('#widget-updates-code').value=data.widgets.updates;openDialog('settings-dialog');
  }
  function readSettingsForm(){return normalizeConfig({...data,siteName:$('#settings-name').value.trim(),subtitle:$('#settings-subtitle').value.trim(),profileUrl:$('#settings-profile').value.trim(),widgets:{grid:$('#widget-grid-code').value,custom:$('#widget-custom-code').value,updates:$('#widget-updates-code').value}});}
  function saveSettings(){const rawProfile=$('#settings-profile').value.trim();if(rawProfile&&!safeProfile(rawProfile)){toast('رابط الملف الشخصي يجب أن يبدأ بـ https://www.goodreads.com/');return false;}data=readSettingsForm();persist();renderAll();toast('حُفظت الإعدادات محليًا. للتحديث على الموقع العام نزّل ملف النشر.');return true;}
  $('#settings-form').addEventListener('submit',e=>{e.preventDefault();if(saveSettings())closeDialog('settings-dialog');});
  for(const selector of ['#open-settings','#footer-settings','#setup-widgets','#widget-help'])$(selector).addEventListener('click',openSettings);
  document.addEventListener('click',e=>{if(e.target.closest('#placeholder-settings'))openSettings();});
  function download(content,filename,type){const blob=new Blob([content],{type});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  $('#export-config').addEventListener('click',()=>{
    const profile=$('#settings-profile').value.trim();if(profile&&!safeProfile(profile)){toast('صحّح رابط Goodreads أولًا.');return;}
    data=readSettingsForm();persist();renderAll();
    download('/* إعدادات النشر الخاصة بمكتبتك — استبدل ملف site-config.js بهذا الملف. */\nwindow.RIWAQ_CONFIG = '+JSON.stringify(data,null,2)+';\n','site-config.js','text/javascript;charset=utf-8');
    toast('تم تنزيل site-config.js. استبدل الملف القديم به عند رفع الموقع.');
  });
  $('#export-backup').addEventListener('click',()=>{data=readSettingsForm();persist();renderAll();download(JSON.stringify(data,null,2),'riwaq-backup.json','application/json;charset=utf-8');toast('تم تنزيل نسخة احتياطية بصيغة JSON.');});
  $('#import-config').addEventListener('change',async(e)=>{
    const file=e.target.files?.[0];if(!file)return;
    try{if(file.size>1000000)throw new Error('الملف كبير جدًا');const parsed=JSON.parse(await file.text());if(!parsed||!Array.isArray(parsed.books))throw new Error('لا يشبه ملف إعدادات مكتبة');if(!confirm('استيراد النسخة الاحتياطية سيستبدل الكتب والإعدادات الحالية في هذا المتصفح. هل تريد المتابعة؟'))return;data=normalizeConfig(parsed);persist();renderAll();closeDialog('settings-dialog');toast('تم استيراد المكتبة بنجاح.');}catch(error){toast('لم يُقرأ الملف: '+error.message);}finally{e.target.value='';}
  });
  const menu=$('#menu-toggle');menu.addEventListener('click',()=>{const open=$('#primary-nav').classList.toggle('open');menu.setAttribute('aria-expanded',String(open));});
  $$('.primary-nav a').forEach(link=>link.addEventListener('click',()=>{$('#primary-nav').classList.remove('open');menu.setAttribute('aria-expanded','false');}));
  if('IntersectionObserver' in window){const observer=new IntersectionObserver(entries=>{const visible=entries.filter(e=>e.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio)[0];if(!visible)return;$$('.nav-link').forEach(link=>link.classList.toggle('active',link.getAttribute('href')==='#'+visible.target.id));},{rootMargin:'-23% 0px -60% 0px'});['top','shelves','journal','goodreads','about'].forEach(id=>{const el=$('#'+id);if(el)observer.observe(el);});}
  renderAll();
})();
