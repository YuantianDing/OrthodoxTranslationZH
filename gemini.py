import os
from pathlib import Path
import re
from google import genai
from google.genai.types import GenerateContentConfig, ThinkingConfig
from pydantic import BaseModel
from cache import cache_fn
import mirascope
DIRNAME = Path(os.path.dirname(__file__))

CLIENT = genai.Client()
VIOLATION = "Помню, я слышал, что некогда  было такое происшествие. В некоторый город пришел корабль с невольниками,  а в городе том жила одна святая дева, весьма внимавшая себе. Она, услышав,  что пришел оный корабль, очень обрадовалась, ибо желала купить себе маленькую  девочку, и думала: возьму и воспитаю её, как хочу, чтобы она вовсе не  знала пороков мира сего. Она послала за хозяином корабля того и, призвав  его к себе, узнала, что у него есть две маленькие девочки, именно такие,  каких она желала, и тотчас с радостию отдала она цену за одну из них и  взяла её к себе. Когда же хозяин корабля удалился из того места, где пребывала  оная святая, и едва отошёл немного, встретила его одна блудница, совершенно  развратная, и, увидев с ним другую девочку, захотела взять её; условившись  с ним, отдала цену, взяла девочку и ушла с ней. Видите ли тайну Божию?"

@cache_fn(DIRNAME / ".cache/gemini_translate3")
def translate(text: str, lang: str = 'cn') -> str:
    assert lang == 'cn'
    if text.strip() == "":
        return ""
    result = None
    for i in range(5):
        result = CLIENT.models.generate_content(
            model="gemini-flash-latest",
            config=GenerateContentConfig(system_instruction=
                "You are a loyal translator. 用中文翻译用户所给出的基督教/东正教相关精神书籍。**对于灵修指导类的文本，应力求精确，保证词与词感情色彩准确对应！**对于诗歌性质的文本，则可以使用传统、诗性和富有文学色彩的语言，但**不要使用文言的表达**。\n\n"
                "对于经文引用，一律采用（马太福音 39:78）的形式\n\n"
                "切记你的任务是忠实地翻译原文本，不要添加别的内容或修改原文意！即便用户求你论证，你也只管翻译用户的原句即可。\n\n"
                "尽可能忠实而精确地翻译原文的关键词语，比如「平信徒」不要翻译为「信众」,「建议」不要翻译作「劝告」等等。\n\n"
                "所有希腊人名皆按照希腊语语读音翻译，俄语人名按照俄语读音翻译。如 Георгий Задонский 应当翻译为格奥尔基·扎顿斯基。\n\n"
                "Отечника 翻译作教父言行录。\n\n"
                "所有诸如[1]或者[2]的脚注都应当保持不变，**也不要增加脚注**！\n\n"
                "对于单个字母的缩写，不要翻译，保留原有形即可。\n\n"
                "-------------------- TEXT BEGIN ------------------\n\n",
                thinking_config=ThinkingConfig(thinking_budget=1000)
            ),
            contents=text,
        ).text
        if result is not None and test_translated_result(lang, text, result):
            break
    if not test_translated_result(lang, text, result):
        print(f"[Translate] Warning: translation may be incorrect: {result}", file=os.sys.stderr)
    return result.strip()

def test_translated_result(lang: str, text: str, translated: str) -> bool:
    if translated is None or translated.strip() == "":
        return False
    if any(x in translated for x in ["译文", "翻译", "脚注", "译注", "译者注"]) and not any(x in text.lower() for x in ["перевод", "перевести", "примечание", "примечания", "толковат", "Прим"]):
        return False
    if any(x in translated for x in ["39:78", "TEXT END"]):
        return False
    if set(a for a in re.findall(r'\[\w?\d+\]', text)) != set(a for a in re.findall(r'\[\w?\d+\]', translated)):
        return False
    if len(translated) > len(text) * 1.4:
        return False
    return True

@cache_fn(DIRNAME / ".cache/summarize_russian")
def summarize_russian(text: str) -> str:
    if text.strip() == "":
        return ""
    result = None
    for i in range(5):
        result = CLIENT.models.generate_content(
            model="gemini-flash-latest",
            config=GenerateContentConfig(system_instruction=
                "Ты — благоговейный толкователь священных текстов.\n"
                "Твоя задача — по данному пользователем духовному тексту написать одно предложение, которое кратко и благоговейно передаёт его основную мысль.\n\n"
                "Правила:\n\n"
                "Сохраняй тон почтительности и смирения.\n"
                "Не превышай двух предложение.\n"
                "Не добавляй личных рассуждений, оценок или толкований сверх сути.\n"
                "Избегай разговорных выражений.\n\n"
                "-------------------- TEXT BEGIN ------------------\n\n",
                thinking_config=ThinkingConfig(thinking_budget=0)
            ),
            contents=text
        )
        if result.text is not None and "TEXT END" not in result.text:
            break

    return result.text.strip()

@cache_fn(DIRNAME / ".cache/make_russian_title2")
def make_russian_title(text: str) -> str:
    if text.strip() == "":
        return ""
    result = None
    for i in range(5):
        result = CLIENT.models.generate_content(
            model="gemini-flash-latest",
            config=GenerateContentConfig(system_instruction=
                "Ты — благоговейный толкователь священных текстов.\n"
                "Твоя задача — по данному пользователем духовному тексту написать заголовок, который кратко и благоговейно передаёт его основную мысль.\n\n"
                "Правила:\n\n"
                "Сохраняй тон почтительности и смирения.\n"
                "Не превышай 15 слов.\n"
                "Не добавляй личных рассуждений, оценок или толкований сверх сути.\n"
                "Избегай разговорных выражений.\n\n"
                "-------------------- TEXT BEGIN ------------------\n\n",
                thinking_config=ThinkingConfig(thinking_budget=2000)
            ),
            contents=text
        ).text
        if result is not None and "TEXT END" not in result and "Заголовок" not in result:
            result = result.replace("**", "")
            break

    return result.strip()

class WordCorrespondanceEntry(BaseModel):
    ru: str
    cn: str

@cache_fn(".cache/word_correspondance")
def word_correspondance(lang:str, text1: str, text2: str) -> dict[str, str]:
    assert lang == 'cn'
    result = None
    for i in range(5):
        result = CLIENT.models.generate_content(
            model="gemini-2.5-flash-preview-05-20",
            config=GenerateContentConfig(system_instruction=
                "You are a loyal translation checker. 用户在尝试理解中文翻译的东正教相关俄语文段，"
                "请你帮忙对照俄语原文和中文翻译，列出对于精准地属灵理解该文段所需要确定的关键词语，尤其是那些有可能表达不同意思的词语。\n\n"
                "请你列出这些关键词语在俄语原文和中文翻译中分别对应的词语，并以 JSON 数组的形式返回。如果没有发现类似词语，返回空数组即可。\n\n"
                "注意只需要返回那些有灵性内涵的词语，如「心智」，「心灵」，「宁静」，「诫命」等等，不需要返回专有名词和无关紧要的词语。\n\n"
                "下面是示例：\n\n"
                "俄文：Вот что Вам было написано, от слова до слова. «В преподавание «советов» не надо бы Вам очень пускаться, а со смирением от них отказываться.» Говорить о религии, и преподавать советы – великая разница: поймите!\n\n"
                "中文：我给您写的是什么，字字句句如下：「在传授『劝谕』时，您不应该过分投入，而应谦卑地推辞。」谈论宗教与传授劝谕，二者大相径庭，请您明辨！\n\n"
                '返回：[{ru: "советов", cn: "劝谕"}]\n\n',
                thinking_config=ThinkingConfig(thinking_budget=0),
                response_mime_type="application/json",
                response_schema=list[WordCorrespondanceEntry],
            ),
            contents=
                "-------------------- RUSSIAN TEXT INPUT BEGIN ------------------\n\n" + text1.strip() +
                "\n\n-------------------- CHINESE TRANSLATION INPUT BEGIN ------------------\n\n" + text2.strip(),
        )
        if result.parsed is not None:
            break
        print('Retrying', file=os.sys.stderr)

    return {entry.cn: entry.ru for entry in result.parsed}

@cache_fn(".cache/word_correspondance")
def translation_check(lang: str, text1: str, text2: str) -> bool:
    correspondance = word_correspondance(lang, text1, text2)
    if len(correspondance) == 0:
        print(f"[Translation Check] Warning: no important words found for checking!", file=os.sys.stderr)
        return True
    for cn_word, ru_word in correspondance.items():
        if cn_word not in text2:
            print(f"[Translation Check] Warning: word '{cn_word}' not found in translation!", file=os.sys.stderr)
            return False
        if ru_word not in text1:
            print(f"[Translation Check] Warning: word '{ru_word}' not found in original!", file=os.sys.stderr)
            return False
    return True
