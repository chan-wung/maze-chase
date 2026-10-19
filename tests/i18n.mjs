import { dictKeys, dictValue, LANGS, setLang, t } from '../src/app/i18n.js';
import { swipeDir } from '../src/ui/touch.js';
import { check, done } from './lib.mjs';

const en = dictKeys('en'), ko = dictKeys('ko');
check('영어·한국어 사전의 키가 같다', en.length === ko.length && en.every((k) => ko.includes(k)), `en=${en.length} ko=${ko.length}`);
check('빈 문구가 없다', LANGS.every((l) => dictKeys(l).every((k) => String(dictValue(l, k)).trim())));
setLang('ko');
check('한국어: 변수 치환', t('hud.level', { n: 3 }) === '3 단계');
setLang('en');
check('영어: 변수 치환', t('hud.level', { n: 3 }) === 'LEVEL 3');
check('없는 키는 키 그대로', t('nope') === 'nope');

check('스와이프: 너무 짧으면 무시', swipeDir(10, -10) === null);
check('스와이프: 가로가 크면 좌우', swipeDir(40, 10) === 'right' && swipeDir(-40, 10) === 'left');
check('스와이프: 세로가 크면 상하', swipeDir(5, 40) === 'down' && swipeDir(5, -40) === 'up');
done();
