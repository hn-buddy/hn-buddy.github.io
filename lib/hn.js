const HNEXT_FAVUSER = 'hnext-favuser';
const LSKEY_FAVUSERS = 'favusers';

let $ = x => document.querySelector(x);
let $$ = x => document.querySelectorAll(x);
let mix = (x, y, a) => x * (1 - a) + y * a;
let is_dom_ready = () => /ready|complete/.test(document.readyState);
// Extensions don't have a good way to report errors.
let shout = (str) => document.title = str;

if (document.readyState == 'ready' || document.readyState == 'complete') {
  updateUI();
} else {
  window.addEventListener('load', updateUI);
}

async function updateUI() {
  let timestamp0 = Date.now();

  if (location.pathname == '/item') {
    await highlightFavUsers();
    augmentCommentLinks();
    highlightRecentComments();
  }

  console.debug('HN page processed in', Date.now() - timestamp0, 'ms');
}

async function highlightFavUsers() {
  let favs = await getFavUsers();
  if (!favs.length) return;

  for (let link of $$('a.hnuser')) {
    let user_id = link.textContent;
    if (favs.indexOf(user_id) >= 0)
      link.classList.add(HNEXT_FAVUSER);
  }
}

function highlightRecentComments() {
  let links = $$('.comhead > .age');
  let times = [...links].map(link => +new Date(link.title)).sort();
  let t_max = times[times.length - 1];
  let t_min = times[0];

  for (let link of links) {
    let time = +new Date(link.title);
    let t_rel = (time - t_min) / (t_max - t_min);
    let st = t_rel ** 4;
    if (!st) continue; // filter out NaNs as a side effect
    let r = mix(0xf6, 0xff, st);
    let g = mix(0xf6, 0xff, st);
    let b = mix(0xef, 0x00, st);
    let hex = [r, g, b].map(x => Math.round(x)).join(',');
    link.style.background = 'rgba(' + hex + ',255)';
  }
}

function augmentCommentLinks() {
  for (let comm of $$('.comtr')) {
    let links = comm.querySelector('.comment .reply u');
    let is_favuser = !!comm.querySelector('.hnext-favuser');
    let votelinks = comm.querySelector('.votelinks');
    let htmls = [];

    if (!links) continue; // e.g. dead comments

    // Firefox Android doesn't like the ?. syntax.
    if (votelinks) {
      let upvote = votelinks.querySelector('.votearrow[title="upvote"]');
      let downvote = votelinks.querySelector('.votearrow[title="downvote"]');
      if (upvote) htmls.push(`<a href="${upvote.parentElement.href}">upvote</a>`);
      if (downvote) htmls.push(`<a href="${downvote.parentElement.href}">downvote</a>`);
    }

    if (is_favuser) htmls.push(`<a href="javascript:void(0)" class="fav">unfavorite</a>`);
    if (!is_favuser) htmls.push(`<a href="javascript:void(0)" class="fav">favorite</a>`);

    links.innerHTML += ' | ' + htmls.join(' | ');
  }

  $('.comment-tree').addEventListener('click', async (e) => {
    if (!e.target.matches('a.fav'))
      return;

    let fav_link = e.target;
    let user_link = fav_link.closest('.comtr').querySelector('a.hnuser');
    let user_id = user_link.textContent;
    let favs, i;

    switch (fav_link.textContent) {
      case 'favorite':
        favs = await getFavUsers();
        i = favs.indexOf(user_id);
        if (i < 0) favs.push(user_id);
        await setFavUsers(favs);
        user_link.classList.add(HNEXT_FAVUSER);
        fav_link.textContent = 'unfavorite';
        break;
      case 'unfavorite':
        favs = await getFavUsers();
        i = favs.indexOf(user_id);
        if (i >= 0) favs.splice(i, 1);
        await setFavUsers(favs);
        user_link.classList.remove(HNEXT_FAVUSER);
        fav_link.textContent = 'favorite';
        break;
    }
  });
}

function setFavUsers(list) {
  return chrome.storage.local.set({ [LSKEY_FAVUSERS]: list });
}

function getFavUsers() {
  return new Promise(resolve =>
    chrome.storage.local.get({ [LSKEY_FAVUSERS]: [] },
      r => resolve(r[LSKEY_FAVUSERS])));
}
