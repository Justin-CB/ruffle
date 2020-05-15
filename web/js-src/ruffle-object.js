import {
    FLASH_MIMETYPE,
    FUTURESPLASH_MIMETYPE,
    FLASH7_AND_8_MIMETYPE,
    FLASH_MOVIE_MIMETYPE,
    FLASH_ACTIVEX_CLASSID,
    is_swf_filename,
    RufflePlayer,
} from "./ruffle-player.js";
import { register_element } from "./register-element";

export default class RuffleObject extends RufflePlayer {
    constructor(...args) {
        const observer = new MutationObserver(function (mutationsList, observer) {
            /* handle if original object is (re)moved */
            RufflePlayer.handle_player_changes(document.getElementsByTagName("ruffle-object"));
        });
        observer.observe(document, { childList: true, subtree: true });
        super(...args);
    }

    connectedCallback() {
        super.connectedCallback();

        this.params = RuffleObject.params_of(this);

        //Kick off the SWF download.
        if (this.attributes.data) {
            this.stream_swf_url(this.attributes.data.value);
        } else if (this.params.movie) {
            this.stream_swf_url(this.params.movie);
        }
    }

    get data() {
        return this.attributes.data.value;
    }

    set data(href) {
        this.attributes.data = href;
    }

    /* The data-broken attribute allows us to polyfill *
     * child elements instead of skipping them when    *
     * the parent object is broken(missing src, etc.)  */

    static is_interdictable(elem) {
        if (elem.hasAttribute("data-polyfilled")) {
        /* Don't polyfill an element twice */
            return false;
        }
        if (
            elem.parentElement &&
            elem.parentElement.tagName.toLowerCase() == "object" &&
            !elem.parentElement.hasAttribute("data-broken")
        ) {
        /* Only polyfill top-level objects */
            let children = elem.getElementsByTagName("*");
            for (let i = 0;i < children.length;i ++) {
                if (
                    children[i].tagName.toLowerCase() == "param" &&
                    children[i].name == "movie"
                ) {
                    children[i].parentElement.removeChild(children[i]);
                }
                /* Remove movie param */
                else if (children[i].tagName.toLowerCase() != "param") {
                    /* Hide fallback content */
                    children[i].style.setProperty("display", "none", "important");
                }
            }
            if (elem.hasAttribute("data")) {
                elem.removeAttribute("data");
            }
            elem.style.setProperty("display", "none", "important");
            return false;
        }
        if (!elem.data) {
            let has_movie = false;
            let params = elem.getElementsByTagName("param");
            for (let i = 0; i < params.length; i++) {
                if (params[i].name == "movie" && params[i].value) {
                    has_movie = true;
                }
            }
            if (!has_movie) {
                elem.setAttribute("data-broken", "broken");
                return false;
            }
        }
        if (
            elem.type === FLASH_MIMETYPE ||
            elem.type === FUTURESPLASH_MIMETYPE ||
            elem.type == FLASH7_AND_8_MIMETYPE ||
            elem.type == FLASH_MOVIE_MIMETYPE
        ) {
            return true;
        } else if (
            elem.attributes &&
            elem.attributes.classid &&
            elem.attributes.classid.value.toLowerCase() === FLASH_ACTIVEX_CLASSID.toLowerCase()
        ) {
            return true;
        } else if (
            (elem.type === undefined || elem.type === "") &&
            elem.attributes.classid === undefined
        ) {
            let params = RuffleObject.params_of(elem);
            if (params && params.movie && is_swf_filename(params.movie)) {
                return true;
            }
            else if (elem.data && is_swf_filename(elem.data)) {
                return true;
            }
            else {
                /* Note: flash fallbacks inside of non-flash objects don't work */
                return false;
            }
        }
        /* Note: flash fallbacks inside of non-flash objects don't work
*/
        return false;
    }

    static params_of(elem) {
        let params = {};

        for (let param of elem.children) {
            if (param.constructor === HTMLParamElement) {
                params[param.name] = param.value;
            }
        }

        return params;
    }

    static from_native_object_element(elem) {
        let external_name = register_element("ruffle-object", RuffleObject);
        let ruffle_obj = document.createElement(external_name);
        let params = elem.getElementsByTagName("param");
        const observer = new MutationObserver(RufflePlayer.handleOriginalAttributeChanges);
        ruffle_obj.copy_element(elem);
        ruffle_obj.original = elem;
        /* Set original for detecting if original is (re)moved */
        for (let i = 0;i < params.length;i ++) {
            if (params[i].name == "movie") {
                params[i].parentElement.removeChild(params[i]);
            }
            /* Remove movie param */
        }
        if (elem.hasAttribute("data")) {
            elem.removeAttribute("data");
        }
        if (elem.hasAttribute("id")) {
            elem.removeAttribute("id");
        }
        if (elem.hasAttribute("name")) {
            elem.removeAttribute("name");
        }
        elem.setAttribute("data-polyfilled", "polyfilled");
        elem.style.setProperty("display", "none", "important");
        /* Turn original object into dummy element */
        observer.observe(elem, { attributes: true });

        return ruffle_obj;
    }
}
