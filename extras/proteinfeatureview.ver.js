/*
 RequireJS 2.1.15 Copyright (c) 2010-2014, The Dojo Foundation All Rights Reserved.
 Available via the MIT or new BSD license.
 see: http://github.com/jrburke/requirejs for details
*/
var requirejs, require, define;
(function (ba) {
    function G(b) {
        return "[object Function]" === K.call(b)
    }

    function H(b) {
        return "[object Array]" === K.call(b)
    }

    function v(b, c) {
        if (b) {
            var d;
            for (d = 0; d < b.length && (!b[d] || !c(b[d], d, b)); d += 1) ;
        }
    }

    function T(b, c) {
        if (b) {
            var d;
            for (d = b.length - 1; -1 < d && (!b[d] || !c(b[d], d, b)); d -= 1) ;
        }
    }

    function t(b, c) {
        return fa.call(b, c)
    }

    function m(b, c) {
        return t(b, c) && b[c]
    }

    function B(b, c) {
        for (var d in b) if (t(b, d) && c(b[d], d)) break
    }

    function U(b, c, d, e) {
        c && B(c, function (c, g) {
            if (d || !t(b, g)) e && "object" === typeof c && c && !H(c) && !G(c) && !(c instanceof
                RegExp) ? (b[g] || (b[g] = {}), U(b[g], c, d, e)) : b[g] = c
        });
        return b
    }

    function u(b, c) {
        return function () {
            return c.apply(b, arguments)
        }
    }

    function ca(b) {
        throw b;
    }

    function da(b) {
        if (!b) return b;
        var c = ba;
        v(b.split("."), function (b) {
            c = c[b]
        });
        return c
    }

    function C(b, c, d, e) {
        c = Error(c + "\nhttp://requirejs.org/docs/errors.html#" + b);
        c.requireType = b;
        c.requireModules = e;
        d && (c.originalError = d);
        return c
    }

    function ga(b) {
        function c(a, k, b) {
            var f, l, c, d, e, g, i, p, k = k && k.split("/"), h = j.map, n = h && h["*"];
            if (a) {
                a = a.split("/");
                l = a.length - 1;
                j.nodeIdCompat &&
                Q.test(a[l]) && (a[l] = a[l].replace(Q, ""));
                "." === a[0].charAt(0) && k && (l = k.slice(0, k.length - 1), a = l.concat(a));
                l = a;
                for (c = 0; c < l.length; c++) if (d = l[c], "." === d) l.splice(c, 1), c -= 1; else if (".." === d && !(0 === c || 1 == c && ".." === l[2] || ".." === l[c - 1]) && 0 < c) l.splice(c - 1, 2), c -= 2;
                a = a.join("/")
            }
            if (b && h && (k || n)) {
                l = a.split("/");
                c = l.length;
                a:for (; 0 < c; c -= 1) {
                    e = l.slice(0, c).join("/");
                    if (k) for (d = k.length; 0 < d; d -= 1) if (b = m(h, k.slice(0, d).join("/"))) if (b = m(b, e)) {
                        f = b;
                        g = c;
                        break a
                    }
                    !i && (n && m(n, e)) && (i = m(n, e), p = c)
                }
                !f && i && (f = i, g = p);
                f && (l.splice(0,
                    g, f), a = l.join("/"))
            }
            return (f = m(j.pkgs, a)) ? f : a
        }

        function d(a) {
            z && v(document.getElementsByTagName("script"), function (k) {
                if (k.getAttribute("data-requiremodule") === a && k.getAttribute("data-requirecontext") === i.contextName) return k.parentNode.removeChild(k), !0
            })
        }

        function e(a) {
            var k = m(j.paths, a);
            if (k && H(k) && 1 < k.length) return k.shift(), i.require.undef(a), i.makeRequire(null, {skipMap: !0})([a]), !0
        }

        function n(a) {
            var k, c = a ? a.indexOf("!") : -1;
            -1 < c && (k = a.substring(0, c), a = a.substring(c + 1, a.length));
            return [k, a]
        }

        function p(a,
                   k, b, f) {
            var l, d, e = null, g = k ? k.name : null, j = a, p = !0, h = "";
            a || (p = !1, a = "_@r" + (K += 1));
            a = n(a);
            e = a[0];
            a = a[1];
            e && (e = c(e, g, f), d = m(r, e));
            a && (e ? h = d && d.normalize ? d.normalize(a, function (a) {
                return c(a, g, f)
            }) : -1 === a.indexOf("!") ? c(a, g, f) : a : (h = c(a, g, f), a = n(h), e = a[0], h = a[1], b = !0, l = i.nameToUrl(h)));
            b = e && !d && !b ? "_unnormalized" + (O += 1) : "";
            return {
                prefix: e,
                name: h,
                parentMap: k,
                unnormalized: !!b,
                url: l,
                originalName: j,
                isDefine: p,
                id: (e ? e + "!" + h : h) + b
            }
        }

        function s(a) {
            var k = a.id, b = m(h, k);
            b || (b = h[k] = new i.Module(a));
            return b
        }

        function q(a,
                   k, b) {
            var f = a.id, c = m(h, f);
            if (t(r, f) && (!c || c.defineEmitComplete)) "defined" === k && b(r[f]); else if (c = s(a), c.error && "error" === k) b(c.error); else c.on(k, b)
        }

        function w(a, b) {
            var c = a.requireModules, f = !1;
            if (b) b(a); else if (v(c, function (b) {
                    if (b = m(h, b)) b.error = a, b.events.error && (f = !0, b.emit("error", a))
                }), !f) g.onError(a)
        }

        function x() {
            R.length && (ha.apply(A, [A.length, 0].concat(R)), R = [])
        }

        function y(a) {
            delete h[a];
            delete V[a]
        }

        function F(a, b, c) {
            var f = a.map.id;
            a.error ? a.emit("error", a.error) : (b[f] = !0, v(a.depMaps, function (f,
                                                                                    d) {
                var e = f.id, g = m(h, e);
                g && (!a.depMatched[d] && !c[e]) && (m(b, e) ? (a.defineDep(d, r[e]), a.check()) : F(g, b, c))
            }), c[f] = !0)
        }

        function D() {
            var a, b, c = (a = 1E3 * j.waitSeconds) && i.startTime + a < (new Date).getTime(), f = [], l = [], g = !1,
                h = !0;
            if (!W) {
                W = !0;
                B(V, function (a) {
                    var i = a.map, j = i.id;
                    if (a.enabled && (i.isDefine || l.push(a), !a.error)) if (!a.inited && c) e(j) ? g = b = !0 : (f.push(j), d(j)); else if (!a.inited && (a.fetched && i.isDefine) && (g = !0, !i.prefix)) return h = !1
                });
                if (c && f.length) return a = C("timeout", "Load timeout for modules: " + f, null,
                    f), a.contextName = i.contextName, w(a);
                h && v(l, function (a) {
                    F(a, {}, {})
                });
                if ((!c || b) && g) if ((z || ea) && !X) X = setTimeout(function () {
                    X = 0;
                    D()
                }, 50);
                W = !1
            }
        }

        function E(a) {
            t(r, a[0]) || s(p(a[0], null, !0)).init(a[1], a[2])
        }

        function I(a) {
            var a = a.currentTarget || a.srcElement, b = i.onScriptLoad;
            a.detachEvent && !Y ? a.detachEvent("onreadystatechange", b) : a.removeEventListener("load", b, !1);
            b = i.onScriptError;
            (!a.detachEvent || Y) && a.removeEventListener("error", b, !1);
            return {node: a, id: a && a.getAttribute("data-requiremodule")}
        }

        function J() {
            var a;
            for (x(); A.length;) {
                a = A.shift();
                if (null === a[0]) return w(C("mismatch", "Mismatched anonymous define() module: " + a[a.length - 1]));
                E(a)
            }
        }

        var W, Z, i, L, X, j = {waitSeconds: 7, baseUrl: "./", paths: {}, bundles: {}, pkgs: {}, shim: {}, config: {}},
            h = {}, V = {}, $ = {}, A = [], r = {}, S = {}, aa = {}, K = 1, O = 1;
        L = {
            require: function (a) {
                return a.require ? a.require : a.require = i.makeRequire(a.map)
            }, exports: function (a) {
                a.usingExports = !0;
                if (a.map.isDefine) return a.exports ? r[a.map.id] = a.exports : a.exports = r[a.map.id] = {}
            }, module: function (a) {
                return a.module ?
                    a.module : a.module = {
                        id: a.map.id, uri: a.map.url, config: function () {
                            return m(j.config, a.map.id) || {}
                        }, exports: a.exports || (a.exports = {})
                    }
            }
        };
        Z = function (a) {
            this.events = m($, a.id) || {};
            this.map = a;
            this.shim = m(j.shim, a.id);
            this.depExports = [];
            this.depMaps = [];
            this.depMatched = [];
            this.pluginMaps = {};
            this.depCount = 0
        };
        Z.prototype = {
            init: function (a, b, c, f) {
                f = f || {};
                if (!this.inited) {
                    this.factory = b;
                    if (c) this.on("error", c); else this.events.error && (c = u(this, function (a) {
                        this.emit("error", a)
                    }));
                    this.depMaps = a && a.slice(0);
                    this.errback =
                        c;
                    this.inited = !0;
                    this.ignore = f.ignore;
                    f.enabled || this.enabled ? this.enable() : this.check()
                }
            }, defineDep: function (a, b) {
                this.depMatched[a] || (this.depMatched[a] = !0, this.depCount -= 1, this.depExports[a] = b)
            }, fetch: function () {
                if (!this.fetched) {
                    this.fetched = !0;
                    i.startTime = (new Date).getTime();
                    var a = this.map;
                    if (this.shim) i.makeRequire(this.map, {enableBuildCallback: !0})(this.shim.deps || [], u(this, function () {
                        return a.prefix ? this.callPlugin() : this.load()
                    })); else return a.prefix ? this.callPlugin() : this.load()
                }
            }, load: function () {
                var a =
                    this.map.url;
                S[a] || (S[a] = !0, i.load(this.map.id, a))
            }, check: function () {
                if (this.enabled && !this.enabling) {
                    var a, b, c = this.map.id;
                    b = this.depExports;
                    var f = this.exports, l = this.factory;
                    if (this.inited) if (this.error) this.emit("error", this.error); else {
                        if (!this.defining) {
                            this.defining = !0;
                            if (1 > this.depCount && !this.defined) {
                                if (G(l)) {
                                    if (this.events.error && this.map.isDefine || g.onError !== ca) try {
                                        f = i.execCb(c, l, b, f)
                                    } catch (d) {
                                        a = d
                                    } else f = i.execCb(c, l, b, f);
                                    this.map.isDefine && void 0 === f && ((b = this.module) ? f = b.exports : this.usingExports &&
                                        (f = this.exports));
                                    if (a) return a.requireMap = this.map, a.requireModules = this.map.isDefine ? [this.map.id] : null, a.requireType = this.map.isDefine ? "define" : "require", w(this.error = a)
                                } else f = l;
                                this.exports = f;
                                if (this.map.isDefine && !this.ignore && (r[c] = f, g.onResourceLoad)) g.onResourceLoad(i, this.map, this.depMaps);
                                y(c);
                                this.defined = !0
                            }
                            this.defining = !1;
                            this.defined && !this.defineEmitted && (this.defineEmitted = !0, this.emit("defined", this.exports), this.defineEmitComplete = !0)
                        }
                    } else this.fetch()
                }
            }, callPlugin: function () {
                var a =
                    this.map, b = a.id, d = p(a.prefix);
                this.depMaps.push(d);
                q(d, "defined", u(this, function (f) {
                    var l, d;
                    d = m(aa, this.map.id);
                    var e = this.map.name, P = this.map.parentMap ? this.map.parentMap.name : null,
                        n = i.makeRequire(a.parentMap, {enableBuildCallback: !0});
                    if (this.map.unnormalized) {
                        if (f.normalize && (e = f.normalize(e, function (a) {
                                return c(a, P, !0)
                            }) || ""), f = p(a.prefix + "!" + e, this.map.parentMap), q(f, "defined", u(this, function (a) {
                                this.init([], function () {
                                    return a
                                }, null, {enabled: !0, ignore: !0})
                            })), d = m(h, f.id)) {
                            this.depMaps.push(f);
                            if (this.events.error) d.on("error", u(this, function (a) {
                                this.emit("error", a)
                            }));
                            d.enable()
                        }
                    } else d ? (this.map.url = i.nameToUrl(d), this.load()) : (l = u(this, function (a) {
                        this.init([], function () {
                            return a
                        }, null, {enabled: !0})
                    }), l.error = u(this, function (a) {
                        this.inited = !0;
                        this.error = a;
                        a.requireModules = [b];
                        B(h, function (a) {
                            0 === a.map.id.indexOf(b + "_unnormalized") && y(a.map.id)
                        });
                        w(a)
                    }), l.fromText = u(this, function (f, c) {
                        var d = a.name, e = p(d), P = M;
                        c && (f = c);
                        P && (M = !1);
                        s(e);
                        t(j.config, b) && (j.config[d] = j.config[b]);
                        try {
                            g.exec(f)
                        } catch (h) {
                            return w(C("fromtexteval",
                                "fromText eval for " + b + " failed: " + h, h, [b]))
                        }
                        P && (M = !0);
                        this.depMaps.push(e);
                        i.completeLoad(d);
                        n([d], l)
                    }), f.load(a.name, n, l, j))
                }));
                i.enable(d, this);
                this.pluginMaps[d.id] = d
            }, enable: function () {
                V[this.map.id] = this;
                this.enabling = this.enabled = !0;
                v(this.depMaps, u(this, function (a, b) {
                    var c, f;
                    if ("string" === typeof a) {
                        a = p(a, this.map.isDefine ? this.map : this.map.parentMap, !1, !this.skipMap);
                        this.depMaps[b] = a;
                        if (c = m(L, a.id)) {
                            this.depExports[b] = c(this);
                            return
                        }
                        this.depCount += 1;
                        q(a, "defined", u(this, function (a) {
                            this.defineDep(b,
                                a);
                            this.check()
                        }));
                        this.errback && q(a, "error", u(this, this.errback))
                    }
                    c = a.id;
                    f = h[c];
                    !t(L, c) && (f && !f.enabled) && i.enable(a, this)
                }));
                B(this.pluginMaps, u(this, function (a) {
                    var b = m(h, a.id);
                    b && !b.enabled && i.enable(a, this)
                }));
                this.enabling = !1;
                this.check()
            }, on: function (a, b) {
                var c = this.events[a];
                c || (c = this.events[a] = []);
                c.push(b)
            }, emit: function (a, b) {
                v(this.events[a], function (a) {
                    a(b)
                });
                "error" === a && delete this.events[a]
            }
        };
        i = {
            config: j, contextName: b, registry: h, defined: r, urlFetched: S, defQueue: A, Module: Z, makeModuleMap: p,
            nextTick: g.nextTick, onError: w, configure: function (a) {
                a.baseUrl && "/" !== a.baseUrl.charAt(a.baseUrl.length - 1) && (a.baseUrl += "/");
                var b = j.shim, c = {paths: !0, bundles: !0, config: !0, map: !0};
                B(a, function (a, b) {
                    c[b] ? (j[b] || (j[b] = {}), U(j[b], a, !0, !0)) : j[b] = a
                });
                a.bundles && B(a.bundles, function (a, b) {
                    v(a, function (a) {
                        a !== b && (aa[a] = b)
                    })
                });
                a.shim && (B(a.shim, function (a, c) {
                    H(a) && (a = {deps: a});
                    if ((a.exports || a.init) && !a.exportsFn) a.exportsFn = i.makeShimExports(a);
                    b[c] = a
                }), j.shim = b);
                a.packages && v(a.packages, function (a) {
                    var b,
                        a = "string" === typeof a ? {name: a} : a;
                    b = a.name;
                    a.location && (j.paths[b] = a.location);
                    j.pkgs[b] = a.name + "/" + (a.main || "main").replace(ia, "").replace(Q, "")
                });
                B(h, function (a, b) {
                    !a.inited && !a.map.unnormalized && (a.map = p(b))
                });
                if (a.deps || a.callback) i.require(a.deps || [], a.callback)
            }, makeShimExports: function (a) {
                return function () {
                    var b;
                    a.init && (b = a.init.apply(ba, arguments));
                    return b || a.exports && da(a.exports)
                }
            }, makeRequire: function (a, e) {
                function j(c, d, m) {
                    var n, q;
                    e.enableBuildCallback && (d && G(d)) && (d.__requireJsBuild =
                        !0);
                    if ("string" === typeof c) {
                        if (G(d)) return w(C("requireargs", "Invalid require call"), m);
                        if (a && t(L, c)) return L[c](h[a.id]);
                        if (g.get) return g.get(i, c, a, j);
                        n = p(c, a, !1, !0);
                        n = n.id;
                        return !t(r, n) ? w(C("notloaded", 'Module name "' + n + '" has not been loaded yet for context: ' + b + (a ? "" : ". Use require([])"))) : r[n]
                    }
                    J();
                    i.nextTick(function () {
                        J();
                        q = s(p(null, a));
                        q.skipMap = e.skipMap;
                        q.init(c, d, m, {enabled: !0});
                        D()
                    });
                    return j
                }

                e = e || {};
                U(j, {
                    isBrowser: z, toUrl: function (b) {
                        var d, e = b.lastIndexOf("."), k = b.split("/")[0];
                        if (-1 !==
                            e && (!("." === k || ".." === k) || 1 < e)) d = b.substring(e, b.length), b = b.substring(0, e);
                        return i.nameToUrl(c(b, a && a.id, !0), d, !0)
                    }, defined: function (b) {
                        return t(r, p(b, a, !1, !0).id)
                    }, specified: function (b) {
                        b = p(b, a, !1, !0).id;
                        return t(r, b) || t(h, b)
                    }
                });
                a || (j.undef = function (b) {
                    x();
                    var c = p(b, a, !0), e = m(h, b);
                    d(b);
                    delete r[b];
                    delete S[c.url];
                    delete $[b];
                    T(A, function (a, c) {
                        a[0] === b && A.splice(c, 1)
                    });
                    e && (e.events.defined && ($[b] = e.events), y(b))
                });
                return j
            }, enable: function (a) {
                m(h, a.id) && s(a).enable()
            }, completeLoad: function (a) {
                var b,
                    c, d = m(j.shim, a) || {}, g = d.exports;
                for (x(); A.length;) {
                    c = A.shift();
                    if (null === c[0]) {
                        c[0] = a;
                        if (b) break;
                        b = !0
                    } else c[0] === a && (b = !0);
                    E(c)
                }
                c = m(h, a);
                if (!b && !t(r, a) && c && !c.inited) {
                    if (j.enforceDefine && (!g || !da(g))) return e(a) ? void 0 : w(C("nodefine", "No define call for " + a, null, [a]));
                    E([a, d.deps || [], d.exportsFn])
                }
                D()
            }, nameToUrl: function (a, b, c) {
                var d, e, h;
                (d = m(j.pkgs, a)) && (a = d);
                if (d = m(aa, a)) return i.nameToUrl(d, b, c);
                if (g.jsExtRegExp.test(a)) d = a + (b || ""); else {
                    d = j.paths;
                    a = a.split("/");
                    for (e = a.length; 0 < e; e -= 1) if (h = a.slice(0,
                            e).join("/"), h = m(d, h)) {
                        H(h) && (h = h[0]);
                        a.splice(0, e, h);
                        break
                    }
                    d = a.join("/");
                    d += b || (/^data\:|\?/.test(d) || c ? "" : ".js");
                    d = ("/" === d.charAt(0) || d.match(/^[\w\+\.\-]+:/) ? "" : j.baseUrl) + d
                }
                return j.urlArgs ? d + ((-1 === d.indexOf("?") ? "?" : "&") + j.urlArgs) : d
            }, load: function (a, b) {
                g.load(i, a, b)
            }, execCb: function (a, b, c, d) {
                return b.apply(d, c)
            }, onScriptLoad: function (a) {
                if ("load" === a.type || ja.test((a.currentTarget || a.srcElement).readyState)) N = null, a = I(a), i.completeLoad(a.id)
            }, onScriptError: function (a) {
                var b = I(a);
                if (!e(b.id)) return w(C("scripterror",
                    "Script error for: " + b.id, a, [b.id]))
            }
        };
        i.require = i.makeRequire();
        return i
    }

    var g, x, y, D, I, E, N, J, s, O, ka = /(\/\*([\s\S]*?)\*\/|([^:]|^)\/\/(.*)$)/mg,
        la = /[^.]\s*require\s*\(\s*["']([^'"\s]+)["']\s*\)/g, Q = /\.js$/, ia = /^\.\//;
    x = Object.prototype;
    var K = x.toString, fa = x.hasOwnProperty, ha = Array.prototype.splice,
        z = !!("undefined" !== typeof window && "undefined" !== typeof navigator && window.document),
        ea = !z && "undefined" !== typeof importScripts,
        ja = z && "PLAYSTATION 3" === navigator.platform ? /^complete$/ : /^(complete|loaded)$/,
        Y = "undefined" !== typeof opera && "[object Opera]" === opera.toString(), F = {}, q = {}, R = [], M = !1;
    if ("undefined" === typeof define) {
        if ("undefined" !== typeof requirejs) {
            if (G(requirejs)) return;
            q = requirejs;
            requirejs = void 0
        }
        "undefined" !== typeof require && !G(require) && (q = require, require = void 0);
        g = requirejs = function (b, c, d, e) {
            var n, p = "_";
            !H(b) && "string" !== typeof b && (n = b, H(c) ? (b = c, c = d, d = e) : b = []);
            n && n.context && (p = n.context);
            (e = m(F, p)) || (e = F[p] = g.s.newContext(p));
            n && e.configure(n);
            return e.require(b, c, d)
        };
        g.config = function (b) {
            return g(b)
        };
        g.nextTick = "undefined" !== typeof setTimeout ? function (b) {
            setTimeout(b, 4)
        } : function (b) {
            b()
        };
        require || (require = g);
        g.version = "2.1.15";
        g.jsExtRegExp = /^\/|:|\?|\.js$/;
        g.isBrowser = z;
        x = g.s = {contexts: F, newContext: ga};
        g({});
        v(["toUrl", "undef", "defined", "specified"], function (b) {
            g[b] = function () {
                var c = F._;
                return c.require[b].apply(c, arguments)
            }
        });
        if (z && (y = x.head = document.getElementsByTagName("head")[0], D = document.getElementsByTagName("base")[0])) y = x.head = D.parentNode;
        g.onError = ca;
        g.createNode = function (b) {
            var c =
                b.xhtml ? document.createElementNS("http://www.w3.org/1999/xhtml", "html:script") : document.createElement("script");
            c.type = b.scriptType || "text/javascript";
            c.charset = "utf-8";
            c.async = !0;
            return c
        };
        g.load = function (b, c, d) {
            var e = b && b.config || {};
            if (z) return e = g.createNode(e, c, d), e.setAttribute("data-requirecontext", b.contextName), e.setAttribute("data-requiremodule", c), e.attachEvent && !(e.attachEvent.toString && 0 > e.attachEvent.toString().indexOf("[native code")) && !Y ? (M = !0, e.attachEvent("onreadystatechange", b.onScriptLoad)) :
                (e.addEventListener("load", b.onScriptLoad, !1), e.addEventListener("error", b.onScriptError, !1)), e.src = d, J = e, D ? y.insertBefore(e, D) : y.appendChild(e), J = null, e;
            if (ea) try {
                importScripts(d), b.completeLoad(c)
            } catch (m) {
                b.onError(C("importscripts", "importScripts failed for " + c + " at " + d, m, [c]))
            }
        };
        z && !q.skipDataMain && T(document.getElementsByTagName("script"), function (b) {
            y || (y = b.parentNode);
            if (I = b.getAttribute("data-main")) return s = I, q.baseUrl || (E = s.split("/"), s = E.pop(), O = E.length ? E.join("/") + "/" : "./", q.baseUrl =
                O), s = s.replace(Q, ""), g.jsExtRegExp.test(s) && (s = I), q.deps = q.deps ? q.deps.concat(s) : [s], !0
        });
        define = function (b, c, d) {
            var e, g;
            "string" !== typeof b && (d = c, c = b, b = null);
            H(c) || (d = c, c = null);
            !c && G(d) && (c = [], d.length && (d.toString().replace(ka, "").replace(la, function (b, d) {
                c.push(d)
            }), c = (1 === d.length ? ["require"] : ["require", "exports", "module"]).concat(c)));
            if (M) {
                if (!(e = J)) N && "interactive" === N.readyState || T(document.getElementsByTagName("script"), function (b) {
                    if ("interactive" === b.readyState) return N = b
                }), e = N;
                e && (b ||
                (b = e.getAttribute("data-requiremodule")), g = F[e.getAttribute("data-requirecontext")])
            }
            (g ? g.defQueue : R).push([b, c, d])
        };
        define.amd = {jQuery: !0};
        g.exec = function (b) {
            return eval(b)
        };
        g(q)
    }
})(this);

define("vendor/require.js", function () {
});

/**
 *  Protein Feature View v. 1.0.1 build 295
 *
 *  Draws a graphical summary of PDB and UniProtKB relationships for a single UniProtKB sequence.
 *
 *  @author Andreas Prlic
 */

/* Derived in parts from PV viewer.
 *
 * (C) Marco Piasini
 *
 * */
define('colors', [], function () {

    "use strict";

    var exports = {};

    exports.rgb = {};

    var rgb = exports.rgb;

    exports.rgb.fromValues = function (x, y, z, w) {
        var out = new Array(4);
        out[0] = x;
        out[1] = y;
        out[2] = z;
        out[3] = w;
        return out;
    };

    exports.rgb.mix = function (out, colorOne, colorTwo, t) {
        var oneMinusT = 1.0 - t;
        out[0] = colorOne[0] * t + colorTwo[0] * oneMinusT;
        out[1] = colorOne[1] * t + colorTwo[1] * oneMinusT;
        out[2] = colorOne[2] * t + colorTwo[2] * oneMinusT;
        out[3] = colorOne[3] * t + colorTwo[3] * oneMinusT;
        return out;
    };

    exports.rgb.hex2rgb = function (color) {
        var r, g, b, a;
        if (color.length === 4 || color.length === 5) {
            r = parseInt(color[1], 16);
            g = parseInt(color[2], 16);
            b = parseInt(color[3], 16);
            a = 15;
            if (color.length === 5) {
                a = parseInt(color[4], 16);
            }
            var oneOver15 = 1 / 15.0;
            return rgb.fromValues(oneOver15 * r, oneOver15 * g,
                oneOver15 * b, oneOver15 * a);
        }
        if (color.length === 7 || color.length === 9) {
            r = parseInt(color.substr(1, 2), 16);
            g = parseInt(color.substr(3, 2), 16);
            b = parseInt(color.substr(5, 2), 16);
            a = 255;
            if (color.length === 9) {
                a = parseInt(color.substr(7, 2), 16);
            }
            var oneOver255 = 1 / 255.0;
            return rgb.fromValues(oneOver255 * r, oneOver255 * g,
                oneOver255 * b, oneOver255 * a);
        }
    };

    var COLORS = {
        white: rgb.fromValues(1.0, 1.0, 1.0, 1.0),
        black: rgb.fromValues(0.0, 0.0, 0.0, 1.0),
        grey: rgb.fromValues(0.5, 0.5, 0.5, 1.0),
        lightgrey: rgb.fromValues(0.8, 0.8, 0.8, 1.0),
        darkgrey: rgb.fromValues(0.3, 0.3, 0.3, 1.0),
        red: rgb.hex2rgb("#AA00A2"),
        darkred: rgb.hex2rgb("#7F207B"),
        lightred: rgb.fromValues(1.0, 0.5, 0.5, 1.0),
        green: rgb.hex2rgb("#C9F600"),
        darkgreen: rgb.hex2rgb("#9FB82E"),
        lightgreen: rgb.hex2rgb("#E1FA71"), // or D8FA3F
        blue: rgb.hex2rgb("#6A93D4"), // or 6A93D4
        darkblue: rgb.hex2rgb("#284A7E"), // or 104BA9
        lightblue: rgb.fromValues(0.5, 0.5, 1.0, 1.0),
        yellow: rgb.hex2rgb("#FFCC73"),
        darkyellow: rgb.fromValues(0.5, 0.5, 0.0, 1.0),
        lightyellow: rgb.fromValues(1.0, 1.0, 0.5, 1.0),
        cyan: rgb.fromValues(0.0, 1.0, 1.0, 1.0),
        darkcyan: rgb.fromValues(0.0, 0.5, 0.5, 1.0),
        lightcyan: rgb.fromValues(0.5, 1.0, 1.0, 1.0),
        magenta: rgb.fromValues(1.0, 0.0, 1.0, 1.0),
        darkmagenta: rgb.fromValues(0.5, 0.0, 0.5, 1.0),
        lightmagenta: rgb.fromValues(1.0, 0.5, 1.0, 1.0),
        orange: rgb.hex2rgb("#FFA200"), // or FFBA40
        darkorange: rgb.fromValues(0.5, 0.25, 0.0, 1.0),
        lightorange: rgb.fromValues(1.0, 0.75, 0.5, 1.0),
        brown: rgb.hex2rgb("#A66A00"),
        purple: rgb.hex2rgb("#D435CD")
    };

    var bw_colors = [{
        "color": "#f0f0f0",
        "darkercolor": "#c0c0c0",
        "lightercolor": "#ffffff",
        "textcolor": "black"
    }, {
        "color": "#d9d9d9",
        "darkercolor": "#aeaeae",
        "lightercolor": "#ffffff",
        "textcolor": "black"
    }, {
        "color": "#bdbdbd",
        "darkercolor": "#979797",
        "lightercolor": "#ffffff",
        "textcolor": "black"
    }, {
        "color": "#969696",
        "darkercolor": "#787878",
        "lightercolor": "#ffffff",
        "textcolor": "black"
    }, {
        "color": "#737373",
        "darkercolor": "#5c5c5c",
        "lightercolor": "#c4c4c4",
        "textcolor": "white"
    }, {
        "color": "#525252",
        "darkercolor": "#424242",
        "lightercolor": "#8b8b8b",
        "textcolor": "white"
    }, {
        "color": "#252525",
        "darkercolor": "#1e1e1e",
        "lightercolor": "#3f3f3f",
        "textcolor": "white"
    }];

    var paired_colors = [{
        "color": "#a6cee3",
        "darkercolor": "#85a5b6",
        "lightercolor": "#ffffff",
        "textcolor": "black"
    }, {
        "color": "#1f78b4",
        "darkercolor": "#196090",
        "lightercolor": "#35ccff",
        "textcolor": "white"
    }, {
        "color": "#b2df8a",
        "darkercolor": "#8eb26e",
        "lightercolor": "#ffffeb",
        "textcolor": "black"
    }, {
        "color": "#33a02c",
        "darkercolor": "#298023",
        "lightercolor": "#57ff4b",
        "textcolor": "black"
    }, {
        "color": "#fb9a99",
        "darkercolor": "#c97b7a",
        "lightercolor": "#ffffff",
        "textcolor": "black"
    }, {
        "color": "#e31a1c",
        "darkercolor": "#b61516",
        "lightercolor": "#ff2c30",
        "textcolor": "black"
    }, {
        "color": "#fdbf6f",
        "darkercolor": "#ca9959",
        "lightercolor": "#ffffbd",
        "textcolor": "black"
    }, {
        "color": "#ff7f00",
        "darkercolor": "#cc6600",
        "lightercolor": "#ffd800",
        "textcolor": "black"
    }, {
        "color": "#cab2d6",
        "darkercolor": "#a28eab",
        "lightercolor": "#ffffff",
        "textcolor": "black"
    }, {
        "color": "#6a3d9a",
        "darkercolor": "#55317b",
        "lightercolor": "#b468ff",
        "textcolor": "white"
    }];

    var redblue_colors = [{
        "color": "#d73027",
        "darkercolor": "#ac261f",
        "lightercolor": "#ff5242",
        "textcolor": "white"
    }, {
        "color": "#f46d43",
        "darkercolor": "#c35736",
        "lightercolor": "#ffb972",
        "textcolor": "black"
    }, {
        "color": "#abd9e9",
        "darkercolor": "#89aeba",
        "lightercolor": "#ffffff",
        "textcolor": "black"
    }, {
        "color": "#74add1",
        "darkercolor": "#5d8aa7",
        "lightercolor": "#c5ffff",
        "textcolor": "black"
    }];

    var domain_colors = [{
        "color": "#ff7f00",
        "darkercolor": "#cc6600",
        "lightercolor": "#ffd800",
        "textcolor": "black"
    }];


    exports.rgb.getBWPalette = function () {
        return bw_colors;
    };

    exports.rgb.getPairedColorPalette = function () {
        return paired_colors;
    };

    exports.rgb.getRedBluePalette = function () {
        return redblue_colors;
    };

    exports.rgb.getDomainColors = function () {
        return domain_colors;
    };

    exports.rgb.componentToHex = function (c) {

        var hex = c.toString(16);

        return hex.length === 1 ? "0" + hex : hex;
    };

    exports.rgb.rgb2hex = function (color) {
        if (color.length === 3) {
            var r = color[0];
            var g = color[1];
            var b = color[2];
            return "#" +
                exports.rgb.componentToHex(r) +
                exports.rgb.componentToHex(g) +
                exports.rgb.componentToHex(b);

        } else if (color.length === 4 || color.length === 5) {

            var r1 = color[0];
            var g1 = color[1];
            var b1 = color[2];
            var a1 = 15;
            if (color.length === 4) {
                a1 = color[3];
            }

            return "#" +
                exports.rgb.componentToHex(r1 * 255) +
                exports.rgb.componentToHex(g1 * 255) +
                exports.rgb.componentToHex(b1 * 255);
        }
        return "#000000";
    };

    /* color is an array of colors, not a string */
    exports.shadeRGBColor = function (color, percent) {
        var f = color,
            t = percent < 0 ? 0 : 255,
            p = percent < 0 ? percent * -1 :
                percent,
            R = parseInt(f[0]),
            G = parseInt(f[1]),
            B = parseInt(f[2]);
        return "rgb(" + (Math.round((t - R) * p) + R) + "," + (Math.round((t - G) * p) + G) + "," +
            (Math.round((t - B) * p) + B) + ")";
    };

    exports.blendRGBColors = function (c0, c1, p) {
        var f = c0.split(","),
            t = c1.split(","),
            R = parseInt(f[0].slice(4)),
            G = parseInt(f[1]),
            B = parseInt(f[2]);
        return "rgb(" + (Math.round((parseInt(t[0].slice(4)) - R) * p) + R) + "," +
            (Math.round((parseInt(t[1]) - G) * p) + G) + "," +
            (Math.round((parseInt(t[2]) - B) * p) + B) + ")";
    };


    // provide an override of the default color setting.
    exports.setColorPalette = function (customColors) {
        // console.log("setting colors");
        COLORS = customColors;
        exports.initGradients();
    };

    // internal function to force various types into an RGBA quadruplet
    exports.forceRGB = function (color) {
        if (typeof color === 'string') {
            var lookup = COLORS[color];
            if (lookup !== undefined) {
                return lookup;
            } else if (color.length > 0 && color[0] === '#') {
                return exports.hex2rgb(color);
            } else {
                console.error("unknown color " + color);
            }
        }
        // in case no alpha component is provided, default alpha to 1.0
        if (color.length === 3) {
            return [color[0], color[1], color[2], 1.0];
        }
        return color;
    };

    exports.forceHex = function (color) {
        var lookup = COLORS[color];
        if (lookup !== undefined) {

            return exports.rgb.rgb2hex(lookup);
        }
    };


    return exports;
});

/**
 *  Protein Feature View v. 1.0.1 build 295
 *
 *  Draws a graphical summary of PDB and UniProtKB relationships for a single UniProtKB sequence.
 *
 *  @author Andreas Prlic
 */

define('params', ['colors'],
    function (colors) {
        function Params() {
            this.textLeft = 20;
            this.leftBorder = 130;
            this.bottomBorder = 15;
            this.trackHeight = 10;
            this.trackHeightCharts = 20;
            this.rightBorder = 10;

            this.maxTracksSingleMode = 10;

            // maximum font size for displayed text (e.g. amino acids, when zoomed into sequence)
            this.maxTextSize = 10;
            this.scale = -1;

            this.y = 0;
            this.maxY = 0;

            this.baseLineHeight = 3;

            this.bw_colors = colors.rgb.getBWPalette();

            this.paired_colors = colors.rgb.getPairedColorPalette();

            this.domain_colors = colors.rgb.getDomainColors();

            this.redblue_colors = colors.rgb.getRedBluePalette().reverse();


            this.customColors = [];
            this.customColors.push(this.paired_colors[0]);
            this.customColors.push(this.paired_colors[1]);
            this.customColors.push(this.paired_colors[8]);
            this.customColors.push(this.paired_colors[9]);


            // homology models...
            this.homColors = [];
            this.homColors.push(this.paired_colors[5]);
            this.homColors.push(this.paired_colors[4]);


            this.up_colors = [];
            this.up_colors.push(this.paired_colors[2]);
            this.up_colors.push(this.paired_colors[3]);

            this.expressionTagColor = colors.rgb.getDomainColors()[0];
            this.conflictColor = colors.rgb.getRedBluePalette()[
            colors.rgb.getRedBluePalette().length - 1];

            this.deletionColor = this.paired_colors[6];
        }


        return {
            Params: function () {
                return new Params();
            }
        };

    });

/**
 *  Protein Feature View v. 1.0.1 build 295
 *
 *  Draws a graphical summary of PDB and UniProtKB relationships for a single UniProtKB sequence.
 *
 *  @author Andreas Prlic
 */

define(
    'icons', [], function () {
        function Icons() {

            // a path for an eye icon -
            // from https://upload.wikimedia.org/wikipedia/commons/6/68/Eye_open_font_awesome.svg

            this.eye = "m 1664,576 q -152,236 -381,353 61,-104 61,-225 0,-185 -131.5,-316.5 " +
                "Q 1081,256 896,256 711,256 579.5," +
                "387.5 448,519 448,704 448,825 509,929 280,812 128,576 261,371 461.5,249.5 662,128 " +
                "896,128 1130,128 1330.5,249.5 " +
                "1531,371 1664,576 z M 944,960 q 0,20 -14,34 -14,14 -34,14 -125,0 -214.5,-89.5 Q 592," +
                "829 592,704 q 0,-20 14,-34 14," +
                "-14 34,-14 20,0 34,14 14,14 14,34 0,86 61,147 61,61 147,61 20,0 34,14 14,14 14,34 " +
                "z m 848,-384 q 0,-34 -20,-69 " +
                "Q 1632,277 1395.5,138.5 1159,0 896,0 633,0 396.5,139 160,278 20,507 0,542 0,576 q " +
                "0,34 20,69 140,229 376.5,368 " +
                "236.5,139 499.5,139 263,0 499.5,-139 236.5,-139 376.5,-368 20,-35 20,-69 z";
        }


        return {
            Icons: function () {
                return new Icons();
            }
        };

    });

/* -*- mode: javascript; c-basic-offset: 4; indent-tabs-mode: nil -*- */
/*jslint maxlen: 120 */
/*global pageTracker:false*/
/*global $:false */
/**
 *  Protein Feature View v. 1.0.1 build 295
 *
 *  Draws a graphical summary of PDB and UniProtKB relationships for a single UniProtKB sequence.
 *
 *  @author Andreas Prlic
 */

define(
    'popups', [], function () {
        function Popups() {
        }

        Popups.prototype.init = function (viewer, rcsbServer) {

            this.viewer = viewer;

            this.rcsbServer = rcsbServer;

        };

        Popups.prototype.showSequenceDialog = function (path) {

            var data = this.viewer.data;

            var svg = this.viewer.getSVGWrapper();

            var offset = $(svg.root()).offset();

            var x = path.pageX - offset.left;

            //var y = path.pageY - offset.top;
            var seqPos = this.viewer.drawer.screen2Seq(x) - 1;

            if (seqPos > this.viewer.data.sequence.length) {
                seqPos = -1;
            }

            var pdbPositions = this.viewer.getPdbPositions(seqPos);

            //$(this.dialogDiv).attr('title', data.uniprotID );
            if (typeof pageTracker !== 'undefined') {
                pageTracker._trackEvent('ProteinFeatureView', 'showSequenceDialog', data.uniprotID);
            }
            var html = "";

            html += this.viewer.showPdb3dLinks(pdbPositions);

            if (this.viewer.singlePDBmode) {
                html += "<h3>" + data.uniprotID + "-" + data.name + "</h3>";
                html += "Show All <a href='" + this.rcsbServer + "/pdb/protein/" + data.uniprotID +
                    "'>PDB-UniProtKB mappings</a> that are available for " + data.uniprotID;

            } else {

                html += "<h3>Search RCSB PDB</h3>";

                html += "<ul><li><a href='" + this.rcsbServer +
                    "/pdb/search/smartSubquery.do?smartSearchSubtype=" +
                    "UpAccessionIdQuery&accessionIdList=" +
                    data.uniprotID + "'>Show All PDB chains</a> that are linked to UniProtKB ID <b>" +
                    data.uniprotID + "</b> - " + data.name + " ?</li>" +
                    " <li>View UniProtKB record for <a href=\"http://www.uniprot.org/uniprot/" +
                    data.uniprotID + "\" " +
                    " target=\"_new\">" + data.uniprotID +
                    "<span class='iconSet-main icon-external'> &nbsp;</span></a></li>";
                html += "</ul>";

            }


            var heading = data.uniprotID + " - " + data.name;
            var strSubmitFunc = "";
            var btnText = "";

            //this.viewer.doModal(this.viewer.dialogDiv, heading, html, strSubmitFunc, btnText);

            this.viewer.registerPdb3dLinks(pdbPositions);

            // if (seqPos >= 0) {
            //   this.viewer.selectionStart = seqPos;
            //   this.viewer.selectionEnd = seqPos;
            //   this.viewer.repaint();
            //
            // }
        };

        Popups.prototype.blastPopup = function (seq, url, hits, desc, txt, pdbPositions) {

            var html = "";

            html += this.viewer.showPdb3dLinks(pdbPositions, "blast");

            html += "<h3>Search RCSB PDB</h3>";

            html += "<ul>";

            if (typeof pageTracker !== 'undefined') {
                pageTracker._trackEvent('ProteinFeatureView', 'showUniProtDialog', txt);
            }

            var murl = this.rcsbServer + "/pdb/search/smart.do?" +
                "chainId_0=&eCutOff_0=0.001&" +
                "maskLowComplexity_0=yes&searchTool_0=blast&smartComparator=" +
                "and&smartSearchSubtype_0=" +
                "SequenceQuery&structureId_0=&target=Current&sequence_0=";

            html += "<li>Perform a <a href='" + murl + seq +
                "'>Blast sequence search against PDB</a> using this sequence region.</li>";

            if (typeof url !== "undefined") {
                // there is a URL, show it

                var urllabel = desc;
                if (typeof hits !== "undefined") {

                    urllabel = "Show " + hits + " PDB entries that contain " + desc +
                        " from " + this.viewer.data.uniprotID;
                }

                html += '<li><a href="' + url + '">' + urllabel + '</a></li>';
            }

            html += "</ul>";

            return html;
        };


        Popups.prototype.sequenceMotifPopup = function (motif, txt, pdbPositions) {

            // console.log("sequenceMotifPopup " + motif + " | " + txt);

            var html = "";

            html += this.viewer.showPdb3dLinks(pdbPositions);

            html += "<h3>" + txt + "</h3>";
            html += "<ul>";
            if (typeof pageTracker !== 'undefined') {
                pageTracker._trackEvent('ProteinFeatureView', 'showSeqMotifDialog', txt);
            }

            var url = this.rcsbServer + "/pdb/search/smart.do?&smartSearchSubtype_0=" +
                "MotifQuery&target=Current&motif_0=";

            html += "<li>Perform a <a href='" + url + motif + "'>Sequence Motif Search</a>.</li>";

            html += "</ul>";
            return html;

        };


        Popups.prototype.clickUpSiteMethod = function (site, event) {

            var parent = event.target || event.toElement;

            var title = parent.title;

            if (typeof title === 'undefined') {
                // probably the tooltip is open
                title = $(parent).attr('data-original-title');
            }

            // show Popup
            if (typeof pageTracker !== 'undefined') {
                pageTracker._trackEvent('ProteinFeatureView',
                    'clickUPSite', this.viewer.data.uniprotID);
            }

            var html = title;

            var pdbPositions = this.viewer.getPdbPositions(site.start - 1, site.end - 1);

            html += this.viewer.showPdb3dLinks(pdbPositions);

            var heading = "UP Sites";

            var strSubmitFunc = "";
            var btnText = "";

            //this.viewer.doModal(this.viewer.dialogDiv, heading, html, strSubmitFunc, btnText);

            this.viewer.registerPdb3dLinks(pdbPositions);

            //this.viewer.highlight(site.start - 1, site.end - 1);

        };

        Popups.prototype.clickPhosphoMethod = function (range, event) {

            var parent = event.target || event.toElement;

            var title = parent.title;

            if (typeof title === 'undefined') {
                // probably the tooltip is open
                title = $(parent).attr('data-original-title');
            }

            var html = title;

            this.viewer.highlight(range.start - 1, range.end - 1);

            var pdbPositions = this.viewer.getPdbPositions(range.start - 1, range.end - 1);

            html += this.viewer.showPdb3dLinks(pdbPositions);

            // show Popup
            if (typeof pageTracker !== 'undefined') {
                pageTracker._trackEvent('ProteinFeatureView',
                    'clickPhosphoSite', this.viewer.data.uniprotID);
            }

            html += "<h3>PhosphoSitePlus</h3>";

            html += "<ul>";

            var url = "http://www.phosphosite.org/" +
                "proteinSearchSubmitAction.do?accessionIds=" +
                this.viewer.data.uniprotID;

            html += "<li>Show at <a target='_new'' href='" + url +
                "'>PhosphoSitePlus website</a></li>";

            html += "</ul>";

            var heading = "Phosphosite";

            var strSubmitFunc = "";
            var btnText = "";

            //this.viewer.doModal(this.viewer.dialogDiv, heading, html, strSubmitFunc, btnText);

            this.viewer.registerPdb3dLinks(pdbPositions);
        };

        Popups.prototype.callbackec = function (range) {

            var brendaurl = "http://www.brenda-enzymes.org/php/result_flat.php4?ecno=";
            var pdbecurl = this.viewer.rcsbServer + "/pdb/search/smartSubquery.do?smartSearchSubtype=" +
                "EnzymeClassificationQuery&Enzyme_Classification=";

            var html = "<h3>" + range.name + " - " + range.desc + "</h3>";
            html += "<ul><li>View in <a href='" + brendaurl + range.name +
                "' target='_new'>BRENDA</a></li>";
            html += "<li>View <a href='" + pdbecurl + range.name + "'>other PDB entries with" +
                " the same E.C. number</a></li>";
            html += "</ul>";

            if (typeof pageTracker !== 'undefined') {
                pageTracker._trackEvent('ProteinFeatureView', 'showECDialog', range.name);
            }


            var heading = range.name + ' - ' + range.desc;

            var strSubmitFunc = "";
            var btnText = "";

            this.viewer.doModal(this.viewer.dialogDiv, heading, html, strSubmitFunc, btnText);

        };

        Popups.prototype.callbackSecStruc = function (event) {

            // show draw dialog..

            var txt = event.name;

            if (event.name !== event.desc) {
                txt += " - " + event.desc;
            }

            var pdbPositions = this.viewer.getPdbPositions(event.start, event.end);

            var html = this.viewer.showPdb3dLinks(pdbPositions, "secstruc");
            var heading = "<h1>" + txt + "</h1>";
            var strSubmitFunc = "";
            var btnText = "";

            this.viewer.doModal(this.viewer.dialogDiv, heading, html, strSubmitFunc, btnText);

            this.viewer.registerPdb3dLinks(pdbPositions, "secstruc");
        };


        Popups.prototype.callbackUniProtFeature = function (event) {


            // show draw dialog..

            var txt = event.name;

            if (event.name !== event.desc) {
                txt += " - " + event.desc;
            }
            console.log("UniProt click " + JSON.stringify(event));
            var pdbPositions = this.viewer.getPdbPositions(event.start - 1, event.end - 1);

            var html = "";
            if (event.name === "short sequence motif") {

                var spl = event.desc.split(" ");
                if (spl.length === 2) {
                    html = this.popup.sequenceMotifPopup(spl[0], txt, event.start, event.end);
                }
            }

            if (html === "") {
                var seq = this.viewer.getData().sequence.substr(event.start, (event.end - event.start + 1));
                html = this.popups.blastPopup(seq, event.url, event.hits, event.desc, txt, pdbPositions);
            }


            var heading = "<h1>" + txt + "</h1>";
            var strSubmitFunc = "";
            var btnText = "";

            this.viewer.doModal(this.viewer.dialogDiv, heading, html, strSubmitFunc, btnText);

            this.viewer.registerPdb3dLinks(pdbPositions, "blast");
        };

        Popups.prototype.scopcallback = function (range) {
            // show draw dialog..

            var txt = range.name;

            if (range.name !== range.desc) {
                txt += " - " + range.desc;

                if (typeof range.note !== 'undefined') {
                    txt += " (" + range.note + ")";
                }
            }

            var html = "";

            var pdbPositions = this.viewer.getPdbPositions(range.start - 1, range.end - 1);

            html += this.viewer.showPdb3dLinks(pdbPositions, "scop");

            html += "<h3>" + txt + "</h3>";
            html += "<ul>";
            if (typeof pageTracker !== 'undefined') {
                pageTracker._trackEvent('ProteinFeatureView', 'showSCOPeDialog', txt);
            }

            var url = "http://scop.mrc-lmb.cam.ac.uk/scop/search.cgi?ver=1.75&key=" + range.name;

            html += "<li>Show at <a target='_new'' href='" + url + "'>SCOP website</a></li>";

            html += "</ul>";

            var heading = txt;

            var strSubmitFunc = "";
            var btnText = "";

            this.viewer.doModal(this.viewer.dialogDiv, heading, html, strSubmitFunc, btnText);
            this.viewer.registerPdb3dLinks(pdbPositions, "scop");
            //this.viewer.highlight(range.start - 1, range.end - 1);

        };

        Popups.prototype.scopecallback = function () {
            // show draw dialog..

            var txt = this.name;

            if (this.name !== this.desc) {
                txt += " - " + this.desc;
                if (typeof this.note !== 'undefined') {
                    txt += " (" + this.note + ")";
                }
            }

            var html = "<h1>" + txt + "</h1>";
            html += "<ul>";
            if (typeof pageTracker !== 'undefined') {
                pageTracker._trackEvent('ProteinFeatureView', 'showSCOPeDialog', txt);
            }

            var url = "http://scop.berkeley.edu/sccs=" + this.name;

            html += "<li>Show at <a target='_new'' href='" + url + "'>SCOPe website</a></li>";


            html += "</ul>";


            var heading = txt;

            var strSubmitFunc = "";
            var btnText = "";

            this.viewer.doModal(this.viewer.dialogDiv, heading, html, strSubmitFunc, btnText);
        };


        Popups.prototype.showPfamDialog = function (pfam) {


            var pfamId = pfam.acc;
            var desc = pfam.desc;
            //$(this.dialogDiv).attr('title', pfamId + ' - '  + pfam.name);
            if (typeof pageTracker !== 'undefined') {
                pageTracker._trackEvent('ProteinFeatureView', 'showPfamDialog', pfamId);
            }

            var html = "";

            var pdbPositions = this.viewer.getPdbPositions(pfam.start - 1, pfam.end - 1);

            html += this.viewer.showPdb3dLinks(pdbPositions);

            html += "<h3> " + desc + "</h3>" +
                "<ul><li>Go to Pfam site for <a href=\"http://pfam.xfam.org/family/" +
                pfamId + "\"" +
                " target=\"_new\">" + pfamId +
                "<span class='iconSet-main icon-external'> &nbsp;</span> </a></li>";

            html += "<li>Find <a href='" + this.rcsbServer +
                "/pdb/search/smartSubquery.do?smartSearchSubtype=PfamIdQuery&amp;pfamID=" +
                pfamId + "'>other PDB entries with the same Pfam domain</a></li>";
            html += "</ul>";


            var heading = pfamId + " - " + pfam.name;
            var strSubmitFunc = "";
            var btnText = "";

            this.viewer.doModal(this.viewer.dialogDiv, heading, html, strSubmitFunc, btnText);
            this.viewer.registerPdb3dLinks(pdbPositions);

        };


        Popups.prototype.showExonDialog = function (exon) {

            var geneId = exon.acc;
            var desc = exon.desc;
            //$(this.dialogDiv).attr('title', pfamId + ' - '  + pfam.name);
            if (typeof pageTracker !== 'undefined') {
                pageTracker._trackEvent('ProteinFeatureView', 'showExonDialog', geneId);
            }

            var html = "<h1> Exon " + desc + "</h1>";

            var pdbPositions = this.viewer.getPdbPositions(exon.start - 1, exon.end - 1);

            html += this.viewer.showPdb3dLinks(pdbPositions);

            html += "<h3>RCSB PDB Gene View</h3>";

            html += "<ul><li>Go to RCSB Gene View for <a href=\"/pdb/gene/" + geneId + "\"" +
                " target=\"_new\">" + geneId + " </a></li>";

            html += "</ul>";


            var heading = geneId + " - " + exon.name;
            var strSubmitFunc = "";
            var btnText = "";

            this.viewer.doModal(this.viewer.dialogDiv, heading, html, strSubmitFunc, btnText);
            this.viewer.registerPdb3dLinks(pdbPositions);
            //this.viewer.highlight(exon.start - 1, exon.end - 1);
        };

        Popups.prototype.clickVariationMethod = function (range, event) {

            var parent = event.target || event.toElement;

            var title = parent.title;

            if (typeof title === 'undefined') {
                // probably the tooltip is open
                title = $(parent).attr('data-original-title');
            }

            // show Popup
            if (typeof pageTracker !== 'undefined') {
                pageTracker._trackEvent('ProteinFeatureView',
                    'clickVariationSNP', this.viewer.data.uniprotID);
            }

            var html = title;

            var pdbPositions = this.viewer.getPdbPositions(range.start - 1, range.end - 1);

            html += this.viewer.showPdb3dLinks(pdbPositions);

            var extLinks = $(parent).data('extLinks');
            if (typeof extLinks !== 'undefined' && extLinks !== "" && extLinks.length > 0) {
                html += "<ul>";

                for (var ext = 0; ext < extLinks.length; ext++) {

                    var extLink = extLinks[ext];
                    if (typeof extLink !== 'undefined' && extLink !== "" &&
                        extLink.sitename !== 'undefined' && extLink.sitename !== "" &&
                        extLink.siteurl !== 'undefined' && extLink.siteurl !== "") {
                        html += "<li>Show at <a target='_new'' href='" + extLink.siteurl +
                            "'>" + extLink.sitename + "</a></li>";
                    }

                }
                html += "</ul>";
            }

            var heading = "Variation";

            var strSubmitFunc = "";
            var btnText = "";

            this.viewer.doModal(this.viewer.dialogDiv, heading, html, strSubmitFunc, btnText);

            this.viewer.registerPdb3dLinks(pdbPositions);

            //this.viewer.highlight(range.start - 1, range.end - 1);
        };


        Popups.prototype.showDialog = function (track, event) {


            if (typeof track === 'undefined') {
                return;
            }

            var pdbID = track.pdbID.trim();
            var desc = track.desc;
            //var chainID = track.chainID.trim();

            if (typeof pageTracker !== 'undefined') {
                pageTracker._trackEvent('ProteinFeatureView', 'showPDBDialog', desc);
            }


            var html = "<span><img width='240' src='https://cdn.rcsb.org/images/rutgers/" +
                pdbID.toLowerCase().substr(1, 2) + "/" + pdbID.toLowerCase() + "/" + pdbID.toLowerCase() + ".pdb1-250.jpg' /></span>";

            var svg = this.viewer.getSVGWrapper();
            var offset = $(svg.root()).offset();

            var x = event.pageX - offset.left;

            //var y = path.pageY - offset.top;
            var seqPos = this.viewer.drawer.screen2Seq(x) - 1;

            if (seqPos > this.viewer.data.sequence.length) {
                seqPos = -1;
            }

            var allPdbPositions = this.viewer.getPdbPositions(seqPos);
            //console.log(allPdbPositions);
            var pdbPositions = [];

            var pos = {};

            pos.pdbId = track.pdbID;
            pos.chainId = track.chainID;

            if (seqPos >= 0) {

                for (var p = 0; p < allPdbPositions.length; p++) {

                    var pdbPos = allPdbPositions[p];
                    if (pdbPos.pdbId === pos.pdbId && pdbPos.chainId === pos.chainId) {
                        pos = pdbPos;
                        break;
                    }
                }
            }


            pdbPositions.push(pos);

            html += this.viewer.showPdb3dLinks(pdbPositions, "uniprot");

            html += "<h3>Search RCSB PDB</h3>";
            html += '<ul>';


            // var svg = '<svg><g transform="matrix(1,0,0,-1,0,10) scale(0.005)" title="" '+
            // 'rel="tooltip" data-toggle="tooltip" data-container="body" style="cursor: pointer;" '+
            // 'data-original-title="Shown in 3D viewer"><path d="' +
            // this.icons.eye +
            // '"></path></g></svg>';


            html += '<li><a href="' + this.viewer.rcsbServer + '/pdb/explore/explore.do?structureId=' +
                pdbID + '">Structure Summary Page for ' + pdbID + '</a></li>';

            html += "</ul>";

            var heading = 'View ' + pdbID + ' - ' + desc;

            //var strSubmitFunc = that.load3DChain(pdbID, chainID);
            var strSubmitFunc = "";
            var btnText = "";

            this.viewer.doModal(this.viewer.dialogDiv, heading, html, strSubmitFunc, btnText);
            this.viewer.registerPdb3dLinks(pdbPositions, "uniprot");
        };


        return {
            Popups: function () {
                return new Popups();
            }
        };

    });

/* -*- mode: javascript; c-basic-offset: 4; indent-tabs-mode: nil -*- */
/*jslint maxlen: 120 */
/*global $:false */
/**
 *  Protein Feature View v. 1.0.1 build 295
 *
 *  Draws a graphical summary of PDB and UniProtKB relationships for a single UniProtKB sequence.
 *
 *  @author Andreas Prlic
 */


/**
 * Provides the "view" of the data
 */

define('draw', ['params', 'colors', 'icons', 'popups'],
    function (params, colors, icons, popups) {

        var colorDict = {};

        function Draw(viewer) {

            this.viewer = viewer;

            this.param = new params.Params();

            this.icons = new icons.Icons();

            this.popups = new popups.Popups();

            this.popups.init(this.viewer, this.viewer.rcsbServer);

            this.scale = 1;

            this.height = 15;

            this.maxY = 0;


            // var svg = viewer.getSVGWrapper();

            // this.defaultGroup = svg.group({
            //               id: 'defaultGroup',
            //               fontWeight: 'bold',
            //               fontSize: '10', fill: 'black'
            //           }
            //       );

        }

        Draw.prototype.getParams = function () {
            return this.param;
        };

        Draw.prototype.getGroup = function (id) {

            var svg = this.viewer.getSVGWrapper();

            var g = svg.group({
                id: id,
                'font-family': 'Roboto',
                'font-weight': 700,
                fontSize: '10',
                fill: 'black'
            });
            return g;
        };

        Draw.prototype.seq2Screen = function (seqpos) {


            return this.param.leftBorder + Math.round(seqpos * this.scale);


        };

        Draw.prototype.screen2Seq = function (screenX) {


            return Math.round((screenX - this.param.leftBorder) / this.scale);


        };


        /** Draw the ruler, which indicated sequence positions
         *
         * @param svg
         * @param sequence
         * @param y
         * @returns
         */
        Draw.prototype.drawRuler = function (svg, sequence, y) {

            var majorTickHeight = 5;
            var minorTickHeight = 2;

            svg.rect(this.seq2Screen(0), y, sequence.length * this.scale, 1, {
                fill: 'black'
            });

            var prevTick = 0;
            for (var i = 0; i < sequence.length; i++) {


                if (((i + 1) % 50) === 0 && (i - prevTick) * this.scale >
                    ((Math.log(i) / Math.log(10) + 1) * 10)) {
                    this.drawTick(svg, i, y, majorTickHeight);
                    prevTick = i;
                } else if (this.scale > 2) {
                    if (((i + 1) % 10) === 0) {
                        this.drawTick(svg, i, y, minorTickHeight);
                    } else if (this.scale > 4) {
                        if (((i + 1) % 5) === 0) {
                            svg.rect(this.seq2Screen(i), y, 1 * this.scale, 4, {
                                fill: 'black'
                            });
                        }
                    }

                    if (this.scale > 8) {
                        svg.rect(this.seq2Screen(i), y, 1, 2, {
                            fill: 'black'
                        });
                    }
                }
            }

            return y + this.param.trackHeight + 10;


        };


        //  draw DB id at beginning of line
        Draw.prototype.drawName = function (svg, g, ty, text, callbackFunction, label) {


            var txt = svg.text(g, this.param.textLeft + 2, ty + this.param.trackHeight - 1, text, {
                style: {
                    'font-family': 'RobotoSlab, sans-serif;',
                    'font-weight': '900'
                }
            });


            if (typeof callbackFunction !== 'undefined') {

                $(txt).css('cursor', 'pointer');

                $(txt).bind('click', function (event) {
                    callbackFunction(event, text);
                });

            }

            if (typeof label !== 'undefined') {

                $(txt).attr("title", label);
                this.registerTooltip(txt);
            } else {
                console.log("no label for track " + text);
            }

        };

        Draw.prototype.drawSequence = function (svg, sequence, y) {

            var seqTrackHeight = this.param.trackHeight + 5;

            if (this.param.singlePDBmode) {
                seqTrackHeight -= 5;
            }

            var g = this.getGroup('sequenceTrack' + this.viewer.getData().uniprotID);
            var blg = svg.group({
                fill: 'lightgrey'
            });
            var bg = svg.group({
                fill: '#dcdcdc'
            });

            this.drawName(svg, g, y, sequence.name, undefined, "UniProtKB sequence " + sequence.name);

            var gs = svg.group({
                id: 'seqpos' + this.viewer.getData().uniprotID,
                fontWeight: 'bold',
                fontSize: '10',
                fill: 'black'
            });

            var defs = svg.defs();

            svg.linearGradient(defs, 'sequence' + this.viewer.getData().uniprotID, [
                    ['0%', 'white'],
                    ['100%', 'black']
                ],
                0, y, 0, y + seqTrackHeight, {
                    gradientUnits: 'userSpaceOnUse'

                }
            );


            var rect = svg.rect(g, this.seq2Screen(0), y, sequence.length * this.scale, seqTrackHeight,
                4, 4, {
                    fill: 'url(#sequence' + this.viewer.getData().uniprotID + ')',
                    stroke: 'grey',
                    strokeWidth: 1
                });


            var title = "UniProtKB sequence " + sequence.name + " - " +
                this.viewer.getData().name + " Length: " + this.viewer.getData().length;

            $(rect).attr('title', title);

            this.registerTooltip(rect);

            y += seqTrackHeight;

            // add label on sequence

            var label = sequence.name + " - " + this.viewer.getData().name + " - " +
                this.viewer.getData().desc;

            var slabel = svg.text(g, this.seq2Screen(1), y - this.param.trackHeight / 2, label, {
                'fill': 'black'
            });
            this.checkTxtLength(slabel, 1, sequence.length, label);
            $(slabel).attr('title', title);
            this.registerTooltip(slabel);

            if (this.scale >= 8) {
                // draw Sequence text

                for (var s = 0; s < sequence.length; s++) {

                    if ((s + 1) % 10 === 0) {
                        svg.rect(bg, this.seq2Screen(s), y, 1 * this.scale, 10);
                    } else if ((s + 1) % 5 === 0) {
                        svg.rect(blg, this.seq2Screen(s), y, 1 * this.scale, 10);
                    }

                    var txt = svg.text(gs, this.seq2Screen(s) + 1, y +
                        this.param.trackHeight - 1, this.viewer.getData().sequence.charAt(s));

                    $(txt).attr('title', "Sequence position " +
                        (s + 1) + " - " + this.viewer.getData().sequence.charAt(s));
                    //$(rect).bind('mouseover', function(event,ui) {
                    //popupTooltip(event,ui,$(this));});
                    //$(rect).mouseout(function(event){hideTooltip();});
                    this.registerTooltip(txt);
                    //registerTooltip(rect);
                    //$(txt).bind('click', function(event) {alert('sequence position: ' +(s+1) );});


                }
                y += this.param.trackHeight;
            }


            // extra spacer
            return y + 5;


        };


        /** draw a plus icon on the left side, that allows to expand the condensed view
         *
         * @param svg
         * @param y
         */
        Draw.prototype.drawExpandCondensedSymbol = function (svg, y, title, callback) {

            var g = svg.group({
                id: 'expandCondensed' + this.viewer.getData().uniprotID,
                fontWeight: 'bold',
                fontSize: '10',
                fill: 'black'
            });


            var arrowBody = svg.rect(g, (this.param.textLeft - 5), y + 1, 2, this.param.trackHeight - 2, {
                fill: 'black'
            });
            y += this.param.trackHeight;

            var arrow = svg.createPath();
            svg.path(g, arrow.move(this.param.textLeft - 4, y).line([
                [this.param.textLeft - 6, y - 4],
                [this.param.textLeft - 2, y - 4]
            ]).close(), {
                fill: 'black',
                stroke: 'black'
            });

            y += 1;

            var circle = svg.circle(g, this.param.textLeft - 4, y + this.param.trackHeight, 8, {
                fill: 'black',
                opacity: '0.2'
            });

            var text = svg.text(g, this.param.textLeft - 8, y + this.param.trackHeight * 1.5 - 1, "+", {
                fontSize: '14',
                fill: 'black',
                fontWeight: 'bold'
            });

            var mylist = [];

            mylist.push(circle);
            mylist.push(text);
            //mylist.push(arrow);
            mylist.push(arrowBody);


            for (var i = 0; i < mylist.length; i++) {

                var me = mylist[i];

                this.registerTooltip(me, title);

                $(me).bind('click', $.proxy(callback));
            }


            return y + this.param.trackHeight * 2 + 1;

        };

        /** draw a plus icon on the left side, that allows to expand the condensed view
         *
         * @param svg
         * @param y
         */
        Draw.prototype.drawCollapseCondensedSymbol = function (svg, y) {

            var g = svg.group({
                id: 'expandCondensed' + this.viewer.getData().uniprotID,
                fontWeight: 'bold',
                fontSize: '10',
                fill: 'black'
            });


            y += 1;

            var circle = svg.circle(g, this.param.textLeft - 4, y + this.param.trackHeight, 8, {
                fill: 'black',
                opacity: '0.2'
            });

            var text = svg.text(g, this.param.textLeft - 7, y + this.param.trackHeight * 1.5 - 1, "-", {
                fontSize: '14',
                fill: 'black',
                fontWeight: 'bold'
            });

            y += this.param.trackHeight * 2.5;

            var arrow = svg.createPath();
            svg.path(g, arrow.move(this.param.textLeft - 4, y - 4).line([
                [this.param.textLeft - 6, y],
                [this.param.textLeft - 2, y]
            ]).close(), {
                fill: 'black',
                stroke: 'black'
            });

            var arrowBody = svg.rect(g, (this.param.textLeft - 5), y, 2, this.param.trackHeight / 2, {
                fill: 'black'
            });

            var title = "Currently showing all PDB matches. Click here to show only representatives.";

            var mylist = [];

            mylist.push(circle);
            mylist.push(text);
            mylist.push(arrow);
            mylist.push(arrowBody);

            var that = this;
            var showCondensed = function () {
                that.viewer.setShowCondensed(true);
                $('#showCondensed').text("Show All");
            };

            for (var i = 0; i < mylist.length; i++) {

                var me = mylist[i];

                $(me).attr('title', title);
                this.registerTooltip(me);
                $(me).bind('click', showCondensed);

            }

            return y + this.param.trackHeight / 2 + 1;

        };

        Draw.prototype.drawSourceIndication = function (svg, name, topY, bottomY) {


            if (bottomY - topY < 2) {
                return;
            }

            var paired_colors = this.param.paired_colors;

            var color = this.param.paired_colors[5].color;

            var shortname = name;
            if (name.indexOf("Structural") > -1) {
                shortname = "SBKB";
            }

            if (name === 'UniProtKB') {
                color = paired_colors[2].darkercolor;
            } else if (name === "PDB" || name === "validation") {
                color = paired_colors[1].darkercolor;
            } else if (name === "Pfam") {
                color = paired_colors[6].color;
            } else if (name === "Calculated") {
                shortname = "Calc";
                name = "Electronic annotation";
                color = 'grey';
            } else if (name === "Domains") {
                shortname = " ";
                color = paired_colors[7].color;
            } else if (name === 'Exon') {
                color = paired_colors[8].color;
            } else if (name === 'Phospho') {
                color = paired_colors[9].color;
            }


            var g = this.getGroup(name + this.viewer.getData().uniprotID);
            $(g).attr('font-weight', 900);

            var rect = svg.rect(g, 11, topY, 10, bottomY - topY, {
                //fill: 'white',
                fill: color,
                stroke: color,
                strokeWidth: 1
            });

            var title = "Data from: " + name;
            $(rect).attr('title', title);
            this.registerTooltip(rect);

            //var rotStr = "rotate(-90, 1," + (bottomY - this.param.trackHeight  ) + ")";
            var rotStr = "rotate(-90,10," + (bottomY - this.param.trackHeight) + ")";
            var txt = svg.text(g, 2, bottomY - this.param.trackHeight + 10, shortname, {
                transform: rotStr,
                fill: 'black',
                'fill-opacity': '0.8'
            });
            $(txt).attr('title', title);
            this.registerTooltip(txt);

        };

        Draw.prototype.drawSeparator = function (svg, y) {


            var g = svg.group({
                id: 'separator',
                fontWeight: 'bold',
                fontSize: '10',
                fill: 'black'
            });
            svg.rect(g, this.param.textLeft, y + (this.param.trackHeight / 4),
                Math.round(this.viewer.getSequence().length * this.scale) + this.leftBorder + this.rightBorder,
                1, {
                    //fill: 'white',
                    fill: 'black',
                    stroke: 'black',
                    strokeWidth: 1
                }
            );

            return y + this.param.trackHeight;

        };


        ///
        Draw.prototype.drawGenericTrack = function (svg, rows, y, label, trackName,
                                                    mycolors, url, callbackFunction, info) {

            if (typeof rows === 'undefined') {
                return y;
            }

            if (rows.length === 0) {
                return y;
            }

            var colorPos = 0;

            var g0 = this.getGroup(label + this.viewer.getData().uniprotID);

            this.drawName(svg, g0, y, label, undefined, info);


            nextRow:
                for (var j = 0; j < rows.length; j++) {

                    var row = rows[j];

                    if (typeof row === 'undefined') {
                        continue;
                    }


                    // prepare the gradients for the colors:
                    // gradients are always per-row of annotations.

                    var groups = [];
                    for (var c = 0; c < mycolors.length; c++) {

                        var mcolor = mycolors[c];

                        var defs = svg.defs();
                        svg.linearGradient(defs, trackName + 'GR' + j + c + this.viewer.getData().uniprotID, [
                                ['0%', 'white'],
                                ['100%', mcolor.darkercolor]
                            ],
                            0, y, 0, y + this.param.trackHeight, {
                                gradientUnits: 'userSpaceOnUse'

                            }
                        );

                        // var mgroup = svg.group({
                        //         id: trackName + this.viewer.getData().uniprotID,
                        //         fontWeight: 'bold',
                        //         fontSize: '10',
                        //         fill: mcolor.textcolor
                        //     }
                        // );

                        var mgroup = this.getGroup(trackName + this.viewer.getData().uniprotID);
                        $(mgroup).attr('fill', mcolor.textcolor);

                        groups[c] = mgroup;
                    }


                    nextInLine:
                        for (var i = 0; i < row.length; i++) {

                            try {
                                var range = row[i];

                                //                  // adjust for the fact that we start counting at 1
                                //                  range.start;
                                //                  range.end;

                                if (typeof range.desc === 'undefined') {
                                    continue nextInLine;
                                }

                                if (trackName.indexOf("scop") === -1) {

                                    // we only do these checks if we are not rendering SCOP
                                    // otherwise some scop domains have weird display


                                    if (range.desc.indexOf('Cytoplasmic') > -1) {
                                        this.drawCytoplasmic(y, svg, range, trackName);
                                        continue nextInLine;
                                    } else if (
                                        (range.desc.indexOf('Periplasmic') > -1) ||
                                        (range.desc.indexOf('Extracellular') > -1) ||
                                        (range.desc.indexOf('Lumenal') > -1)
                                    ) {
                                        this.drawPeriplasmic(y, svg, range, trackName);
                                        continue nextInLine;
                                    } else if (range.name.indexOf('transmembrane') > -1) {
                                        this.drawTransmembrane(y, svg, range, trackName);
                                        continue nextInLine;
                                    } else if (range.name.indexOf('intramembrane') > -1) {
                                        this.drawIntramembrane(y, svg, range, trackName);
                                        continue nextInLine;
                                    }
                                }

                                colorPos++;
                                if (colorPos >= mycolors.length) {
                                    colorPos = 0;
                                }

                                var color = mycolors[colorPos];
                                var g = groups[colorPos];

                                var width = (range.end - range.start) + 1;

                                var x1 = this.seq2Screen(range.start - 1);

                                // get gradient name and group name
                                var gradientName = trackName + 'GR' + j + colorPos + this.viewer.getData().uniprotID;


                                var rect = svg.rect(g, x1, y, width * this.scale, this.param.trackHeight,
                                    4, 4, {
                                        fill: 'url(#' + gradientName + ')',
                                        stroke: color.darkercolor,
                                        strokeWidth: 1
                                    });


                                var txt = svg.text(g, x1 + this.scale, y + this.param.trackHeight - 1, range.desc);


                                this.checkTxtLength(txt, range.start, range.end, range.desc);


                                var title = range.desc;
                                if (range.desc !== range.name) {
                                    title += "-" + range.name;
                                }
                                if (typeof range.status !== 'undefined') {
                                    title += " - " + range.status;
                                }


                                $(rect).attr('title', title);
                                this.registerTooltip(rect);

                                $(txt).attr('title', title);
                                this.registerTooltip(txt);


                                if (typeof url !== 'undefined') {
                                    $(rect).css('cursor', 'pointer');
                                    $(txt).css('cursor', 'pointer');
                                    $(rect).bind('click', this.newLocationMethod);
                                    $(txt).bind('click', this.newLocationMethod);
                                }


                                if (typeof callbackFunction !== 'undefined') {
                                    $(rect).css('cursor', 'pointer');
                                    $(txt).css('cursor', 'pointer');
                                    //$(rect).bind('click',
                                    //function(event){callbackFunction(event,range);});
                                    //$(txt).bind('click',
                                    //function(event){callbackFunction(event,range);});
                                    $(rect).bind('click', $.proxy(callbackFunction, this, range));
                                    $(txt).bind('click', $.proxy(callbackFunction, this, range));
                                }

                            } catch (e) {
                                alert("Problem while drawing generic track: " + label + " " + e);
                                console.log(e);
                            }
                        }
                    y += this.param.trackHeight + 5;
                }
            return y;

        };


        Draw.prototype.drawVariation = function (svg, y) {
            if (typeof this.viewer.getData().variation === 'undefined') {
                return y;
            }

            if (this.viewer.getData().variation.tracks.length < 1) {
                return y;
            }

            // mini space to keep distance to above.
            y += 7;

            var g = this.getGroup('variationTrackG' + this.viewer.getData().uniprotID);

            this.drawName(svg, g, y, 'Variation', undefined, this.viewer.getData().variation.label);

            var siteTrackHeight = this.param.trackHeight + 5;

            var variationColors = new Array(1);
            variationColors[0] = this.param.paired_colors[3];

            this.drawSiteResidues(svg, this.viewer.getData().variation, y, 'upVariationTrack' +
                this.viewer.getData().uniprotID, variationColors, 'up', siteTrackHeight,
                this.popups.clickVariationMethod);

            return y + siteTrackHeight;

        };

        Draw.prototype.drawUPSites = function (svg, y) {


            if (typeof this.viewer.getData().upsites === 'undefined') {
                return y;
            }

            if (this.viewer.getData().upsites.tracks.length < 1) {
                return y;
            }

            // mini space to keep distance to above.
            y += 2;

            // var g = svg.group({
            //         id: 'upsitesTrackG' + this.viewer.getData().uniprotID,
            //         fontWeight: 'bold',
            //         fontSize: '10', fill: 'black'
            //     }
            // );

            var g = this.getGroup('upsitesTrackG' + this.viewer.getData().uniprotID);

            this.drawName(svg, g, y, 'UP Sites', undefined, this.viewer.getData().upsites.label);

            var siteTrackHeight = this.param.trackHeight + 5;

            this.drawSiteResidues(svg, this.viewer.getData().upsites, y, 'upsitesTrack' +
                this.viewer.getData().uniprotID, this.param.paired_colors, 'up', siteTrackHeight,
                this.popups.clickUpSiteMethod);

            return y + siteTrackHeight;

        };

        Draw.prototype.drawPhosphoSites = function (svg, y) {


            if (typeof this.viewer.getData().phospho === 'undefined') {

                return y;
            }

            if (this.viewer.getData().phospho.tracks.length < 1) {

                return y;
            }

            y = y + 5;

            var g = this.getGroup('phosphositesTrackG' + this.viewer.getData().uniprotID);

            this.drawName(svg, g, (y + this.param.trackHeight), 'Phosphosite', undefined,
                this.viewer.getData().phospho.label);

            var siteTrackHeight = this.param.trackHeight + 5;

            this.drawSiteResidues(svg, this.viewer.getData().phospho, y, 'phosphositesTrack' +
                this.viewer.getData().uniprotID, this.param.paired_colors,
                'up', siteTrackHeight, this.popups.clickPhosphoMethod);

            return y + siteTrackHeight + 22;


        };

        Draw.prototype.drawPDBSites = function (svg, y) {


            if (typeof this.viewer.getData().pdbsites === 'undefined') {
                return y;
            }

            if (this.viewer.getData().pdbsites.tracks.length < 1) {
                return y;
            }


            var g = this.getGroup('sitesTrackG' + this.viewer.getData().uniprotID);

            this.drawName(svg, g, y, 'PDB Sites', undefined, this.viewer.getData().pdbsites.label);

            var siteTrackHeight = this.param.trackHeight + 5;

            this.drawSiteResidues(svg, this.viewer.getData().pdbsites, y, 'sitesTrack' +
                this.viewer.getData().uniprotID, this.param.paired_colors, 'down', siteTrackHeight);

            return y + siteTrackHeight + 2;

        };


        Draw.prototype.drawRSRZOutlier = function (svg, g, site, sequence, y) {


            var baseLineHeight = this.param.baseLineHeight;
            var siteTrackHeight = this.param.trackHeight + 5;

            var validationRed = this.param.paired_colors[5];

            var rect = svg.rect(g, this.seq2Screen(site.start) - this.scale / 2, y + baseLineHeight,
                2, siteTrackHeight - baseLineHeight, {
                    fill: 'black'
                });

            var circle = svg.circle(g, this.seq2Screen(site.start) - this.scale / 2, y, 4, {
                fill: validationRed.color,
                stroke: validationRed.darkerColor,
                strokeWidth: 1
            });

            var title = "Poor fit to the electron density (RSRZ > 2) chain " +
                site.chainID + " PDB residue: " + site.pdbStart;

            $(rect).attr("title", title);
            $(circle).attr("title", title);
            this.registerTooltip(rect);
            this.registerTooltip(circle);

        };

        Draw.prototype.drawPDBValidation = function (svg, sequence, y) {


            if (typeof this.viewer.getData().validation === 'undefined') {

                return y;
            }

            if (this.viewer.getData().validation.tracks.length < 1) {
                return y;
            }


            var trackName = "validationReport";

            var g = this.getGroup('validationTrackG' + this.viewer.getData().uniprotID);

            var defs2 = svg.defs();

            // init the gradients for the validation colors.

            var ctmp = this.param.paired_colors[5].color;
            var validationRed = colors.rgb.hex2rgb(ctmp);


            var validationColors = [
                colors.forceRGB('darkgreen'),
                colors.forceRGB('yellow'),
                colors.forceRGB('orange'),
                validationRed
            ];


            for (var i = 0; i < validationColors.length; i++) {

                var validationColor = validationColors[i];

                var finalValCol = colors.rgb.rgb2hex(validationColor);

                // var validationColorLight = colors.shadeRGBColor(validationColor,90);


                var gradientName = trackName + 'GR' + i + this.viewer.getData().uniprotID;

                svg.linearGradient(defs2, gradientName, [
                        ['0%', finalValCol],
                        ['50%', finalValCol],
                        ['100%', finalValCol]
                    ],
                    0, y, 0, y + this.param.trackHeight, {
                        gradientUnits: 'userSpaceOnUse'

                    }
                );
            }

            // end of init default gradients.


            this.drawName(svg, g, y, 'PDB Validation', undefined, this.viewer.getData().validation.label);

            var validationTrackHeight = this.param.trackHeight + 5;

            var tracks = this.viewer.getData().validation.tracks;


            for (var s = 0; s < tracks.length; s++) {

                var valid = tracks[s];

                if (valid.name === 'poorFit') {

                    continue;
                }

                valid.desc = parseInt(valid.desc);

                if (valid.desc > 3) {
                    valid.desc = 3;
                }

                var myGradientName = trackName + 'GR' + valid.desc + this.viewer.getData().uniprotID;
                var seqPos = valid.start - 1;

                // var vc = validationColors[valid.desc];
                // var fvc = colors.rgb.rgb2hex(vc);
                var rect = svg.rect(this.seq2Screen(seqPos), y + 5,
                    1 * this.scale + 1, this.param.trackHeight, {
                        fill: 'url(#' + myGradientName + ')'

                    });

                // draw line at bottom to wrap up
                svg.rect(this.seq2Screen(seqPos), y + validationTrackHeight,
                    1 * this.scale + 1, 1, {
                        fill: 'black'

                    });

                var title = valid.desc + " problem(s) for " + valid.pdbID + " residue " + valid.pdbStart +
                    "  in chain " + valid.chainID;

                $(rect).attr("title", title);
                this.registerTooltip(rect);
            }

            var outlierG = svg.group({
                id: 'validationTrackOutlierG' + this.viewer.getData().uniprotID,
                fontWeight: 'bold',
                fontSize: '10',
                fill: 'black'
            });

            // in a second loop, draw the outliers, so they are always "on top"
            for (var s2 = 0; s2 < tracks.length; s2++) {

                var validt = tracks[s2];

                if (validt.name === 'poorFit') {
                    this.drawRSRZOutlier(svg, outlierG, validt, sequence, y);

                }
            }

            // console.log("returning " + (y + validationTrackHeight + 2));
            return y + validationTrackHeight + 2;

        };

        Draw.prototype.drawSCOP = function (svg, sequence, y) {

            if (typeof this.viewer.getData().scop === 'undefined') {
                return y;
            }

            var trackrows = this.breakTrackInRows(this.viewer.getData().scop.tracks);

            //console.log("SCOP trackrows: " + trackrows);

            y = this.drawGenericTrack(svg, trackrows, y, 'SCOP domains',
                'scopDomains', colors.rgb.getDomainColors(), undefined,
                this.popups.scopcallback, this.viewer.getData().scop.label);

            if (typeof this.viewer.getData().scope === 'undefined') {
                return y;
            }


            var trackrowsE = this.breakTrackInRows(this.viewer.getData().scope.tracks);
            //console.log("Draw scope: " + JSON.stringify(trackrowsE));
            y = this.drawGenericTrack(svg, trackrowsE, y, 'SCOPe domains',
                'scopeDomains', colors.rgb.getDomainColors(), undefined, this.popups.scopecallback,
                this.viewer.getData().scope.label);


            return y;

        };


        Draw.prototype.drawExons = function (svg, sequence, y) {

            if (typeof this.viewer.getData().exon === 'undefined') {
                return y;
            }

            if (this.viewer.getData().exon.tracks.length < 1) {
                return y;
            }


            y += 5;

            var exonTrackHeight = this.param.trackHeight;

            var g = this.getGroup('exonTrack' + this.viewer.getData().uniprotID);

            this.drawName(svg, g, y, "Exon Structure", undefined, this.viewer.getData().exon.label);

            for (var i = 0; i < this.viewer.getData().exon.tracks.length; i++) {


                var domainOrig = this.viewer.getData().exon.tracks[i];


                // var domainOrig =this.viewer.getData().exon.tracks[i];

                var domain = {};
                domain.start = domainOrig.start;
                domain.end = domainOrig.end;
                domain.name = domainOrig.name;
                domain.desc = domainOrig.desc;

                var x1 = this.seq2Screen(domain.start - 1);
                var length = domain.end - domain.start + 1;


                var color = this.param.paired_colors[8];

                var defs = svg.defs();

                // var g2 = svg.group({
                //     id: 'exon' + i, fontWeight: 'bold',
                //     fontSize: '10', fill: 'black'
                // });

                var g2 = this.getGroup('exon' + i);


                if (i % 2 === 0) {
                    svg.linearGradient(defs, 'exon' + i, [
                            ['0%', 'white'],
                            ['100%', color.color]
                        ],
                        0, y, 0, y + exonTrackHeight, {
                            gradientUnits: 'userSpaceOnUse'

                        }
                    );

                } else {
                    svg.linearGradient(defs, 'exon' + i, [
                            ['0%', color.color],
                            ['100%', 'white']
                        ],
                        0, y, 0, y + exonTrackHeight, {
                            gradientUnits: 'userSpaceOnUse'
                        }
                    );
                }

                var rect = svg.rect(g2, x1, y, length * this.scale, exonTrackHeight,
                    0, 0, {
                        //fill: 'white',
                        fill: 'url(#exon' + i + ')',
                        stroke: color.darkercolor,
                        strokeWidth: 1
                    }
                );


                var title = "Exon Structure " + domain.name + " - " + domain.desc;

                $(rect).attr("title", title);

                //var length = tooltip.getComputedTextLength();

                var txt = svg.text(g2, x1 + this.scale, y + this.param.trackHeight - 1,
                    domain.name + " - " + domain.desc);


                this.checkTxtLength(txt, domain.start, domain.end, domain.name);

                this.registerTooltip(rect);


                $(txt).attr("title", "Exon Structure " + domain.name + " - " + domain.desc);
                this.registerTooltip(txt);
            }


            return y + 2 * this.height;


        };

        Draw.prototype.drawJronn = function (svg, sequence, y) {


            if (typeof this.viewer.getData().jronn === 'undefined') {
                return y;
            }


            //alert(JSON.stringify(data.jronn));
            var g = this.getGroup('disorder' + this.viewer.getData().uniprotID);
            this.drawName(svg, g, y + this.param.trackHeight, 'Disorder', undefined, this.viewer.getData().jronn.label);

            //var min = parseFloat(data.jronn_min);
            //var max = parseFloat(data.jronn_max);
            // JRONN is always between 0 and 1, can ignore the provided min and max...
            var min = 0;
            var max = 1;
            //var min = 0;
            //var max = 0.8;
            //alert (min + " " + max);
            var adjustedSize = parseFloat(max + Math.abs(min));

            var heightScale = (this.param.trackHeightCharts - 2) / adjustedSize;

            var red = this.param.paired_colors[5];
            var blue = this.param.paired_colors[1];

            //alert(heightScale + " " + adjustedSize);
            for (var s = 0; s < sequence.length; s++) {

                var jronpos = this.viewer.getData().jronn.tracks[s];
                if (typeof jronpos === 'undefined') {
                    //alert("jronpos undef " + s);
                    continue;
                }

                var val = Math.abs(parseFloat(jronpos.desc));
                var score = val;

                if (val >= 0) {
                    score += Math.abs(min);
                }

                var posHeight = Math.abs(score) * heightScale;
                // max = y;
                // 0 == trackHeight/2;
                // min = y+trackHeight;
                var col = blue.color;
                if (val > 0.5) {
                    col = red.darkercolor;
                }


                var tmph = posHeight;
                if (tmph < 0) {
                    console.log(s + " score: " + score + " orig: " + jronpos.desc + " tmph:" +
                        tmph + " posH: " + posHeight + " totalH:" + this.param.trackHeightCharts);
                }


                svg.rect(this.seq2Screen(s), y - posHeight + this.param.trackHeightCharts - 2, 1 * this.scale + 1, tmph, {
                    fill: col
                });

            }

            //  svg.rect(g,seq2Screen(0), y -( 0.5+min) * heightScale +
            //trackHeightCharts,sequence.length * scale, 1,{fill: 'black'});

            return y + this.param.trackHeightCharts;

        };

        /** Draw the hydropathy of the sequence
         *
         * @param svg
         * @param sequence
         * @param y
         */
        Draw.prototype.drawHydropathy = function (svg, sequence, y) {

            if (typeof this.viewer.getData().hydropathy === 'undefined') {
                return y;
            }

            var red = this.param.paired_colors[5];
            var blue = this.param.paired_colors[1];

            var g = this.getGroup('hydropathy' + this.viewer.getData().uniprotID);

            this.drawName(svg, g, y + this.param.trackHeight, 'Hydropathy',
                undefined, this.viewer.getData().hydropathy.label);

            // this line represents a score of 0;
            svg.rect(g, this.seq2Screen(0), y + this.param.trackHeightCharts / 2,
                sequence.length * this.scale, 1, {
                    fill: 'black'
                });

            var min = parseFloat(this.viewer.getData().hydropathy_min);
            var max = parseFloat(this.viewer.getData().hydropathy_max);
            var adjustedSize = (max + Math.abs(min));

            var heightScale = this.param.trackHeightCharts / adjustedSize;
            //alert(heightScale + " " + adjustedSize);
            for (var s = 0; s < sequence.length; s++) {

                var hydro = this.viewer.getData().hydropathy.tracks[s];
                if (typeof hydro === 'undefined') {
                    continue;
                }
                var val = parseFloat(hydro.desc);

                var score = parseFloat(hydro.desc);

                if (val > 0) {
                    score += Math.abs(min);
                }

                var posHeight = Math.abs(score * heightScale);
                // max = y;
                // 0 == trackHeight/2;
                // min = y+trackHeight;
                if (val < 0) {
                    svg.rect(this.seq2Screen(s), y + this.param.trackHeightCharts / 2, 1 * this.scale + 1, posHeight, {
                        fill: blue.color
                    });
                } else {
                    var tmp = posHeight - this.param.trackHeightCharts / 2;
                    if (tmp < 0) {
                        tmp = 0;
                    }
                    svg.rect(this.seq2Screen(s), y - posHeight + this.param.trackHeightCharts, 1 * this.scale + 1, tmp, {
                        fill: red.color
                    });
                }

            }

            return y + this.param.trackHeightCharts + this.param.trackHeight / 2;

        };

        /** Draw the hydropathy of the sequence
         *
         * @param svg
         * @param sequence
         * @param y
         */
        Draw.prototype.drawSignalP = function (svg, sequence, y) {

            if (typeof this.viewer.getData().signalp === 'undefined') {
                return y;
            }


            y = this.drawGenericTrack(svg, this.viewer.getData().signalp, y, 'SignalP',
                'signalP', this.param.up_colors, undefined, this.callback, this.viewer.getData().signalp.label);

        };

        Draw.prototype.drawSelection = function (svg, bottomY) {

            if (this.viewer.selectionStart < 0) {
                return;
            }

            if (typeof bottomY === 'undefined') {
                bottomY = this.maxY;
            }

            var topY = 0;

            var g = svg.group({
                id: 'selection' + this.viewer.getData().uniprotID,
                fontWeight: 'bold',
                fontSize: '10',
                border: this.param.paired_colors[6].color,
                fill: 'white',
                'fill-opacity': '0'
            });


            var length = (this.viewer.selectionEnd - this.viewer.selectionStart + 1);

            //console.log("selection:" + this.viewer.selectionStart + " - " + this.selectionEnd);

            var rect = svg.rect(g, this.seq2Screen(this.viewer.selectionStart), topY, length * this.scale, bottomY,
                0, 0, {
                    //                fill: 'url(#selection' +this.viewer.getData().uniprotID + ')',
                    stroke: this.param.paired_colors[5].lightercolor,
                    strokeWidth: 1,
                    style: '/* rule 1 */ use { fill-opacity: .5 } '
                });

            //TODO: in principle this shows a tooltip, but the positioning if off...
            $(rect).attr("data-toggle", "tooltip");
            $(rect).attr("data-placement", "top");
            $(rect).attr("data-container", "body");
            $(rect).attr("title", "selection: " + this.viewer.selectionStart + "-" + this.viewer.selectionEnd);
            $(rect).text("selection: " + this.viewer.selectionStart + "-" + this.viewer.selectionEnd);
            $(rect).tooltip();


        };

        Draw.prototype.drawPfam = function (svg, y) {


            if (typeof this.viewer.getData().pfam === 'undefined') {
                return y;
            }

            if (this.viewer.getData().pfam.tracks.length < 1) {
                return y;
            }

            y += 5;

            var pfamTrackHeight = this.param.trackHeight;

            var g = this.getGroup('pfamTrack' + this.viewer.getData().uniprotID);
            this.drawName(svg, g, y, "Pfam", undefined, this.viewer.getData().pfam.label);

            for (var i = 0; i < this.viewer.getData().pfam.tracks.length; i++) {

                var domainOrig = this.viewer.getData().pfam.tracks[i];

                var domain = {};
                domain.start = domainOrig.start - 1;
                domain.end = domainOrig.end - 1;
                domain.name = domainOrig.name;
                domain.desc = domainOrig.desc;

                var x1 = this.seq2Screen(domain.start);
                var length = domain.end - domain.start + 1;

                //          var colorPos = i ;
                //          if ( i > bw_colors.length -1 )
                //          colorPos = i% bw_colors.length;


                //var color = bw_colors[colorPos];
                var color = this.param.paired_colors[6];

                var defs = svg.defs();

                // var g2 = svg.group({
                //     id: 'pfam' + i, fontWeight: 'bold',
                //     fontSize: '10', fill: color.textcolor
                // });

                var g2 = this.getGroup('pfam' + i);
                $(g2).attr('fill', color.textcolor);

                svg.linearGradient(defs, 'pfam' + i, [
                        ['0%', color.lightercolor],
                        ['100%', color.darkercolor]
                    ],
                    0, y, 0, y + pfamTrackHeight, {
                        gradientUnits: 'userSpaceOnUse'

                    }
                );

                var rect = svg.rect(g2, x1, y, length * this.scale, pfamTrackHeight,
                    3, 3, {
                        //fill: 'white',
                        fill: 'url(#pfam' + i + ')',
                        stroke: color.darkercolor,
                        strokeWidth: 1
                    }
                );

                //$(rect).css('class','tooltip');


                var title = "Pfam Domain " + domain.name + " - " + domain.desc;

                $(rect).attr("title", title);

                //var length = tooltip.getComputedTextLength();

                var txt = svg.text(g2, x1 + this.scale, y + this.param.trackHeight - 1,
                    domain.name + " - " + domain.desc);


                this.checkTxtLength(txt, domain.start, domain.end, domain.name);

                this.registerTooltip(rect);


                $(txt).attr("title", "Pfam Domain " + domain.name + " - " + domain.desc);
                this.registerTooltip(txt);

            }

            return y + this.height + 5;

        };


        Draw.prototype.highlightTrack = function (svg, track, y, trackID) {

            if (track === null) {
                return y;
            }

            var g = this.getGroup(trackID);

            var width = this.viewer.getData().length;

            svg.rect(g, 0, y,
                this.param.leftBorder + Math.round(width * this.scale) + this.param.rightBorder, this.param.trackHeight, {
                    fill: 'lightgrey',
                    stroke: 'lightgrey',
                    strokeWidth: 1
                });

        };

        Draw.prototype.draw3dFlagForTrack = function (svg, track, y) {

            if (track === null) {
                return y;
            }

            // console.log("showing track in 3D:" + trackID + " " + track.pdbID);

            var trnsfrm = "matrix(1,0,0,-1,0," + (y + this.param.trackHeight) + ") scale(0.005)";

            var g1 = svg.group({
                transform: trnsfrm
            });

            svg.path(g1, this.icons.eye, {});

            $(g1).attr("title", "Shown in 3D viewer");

            this.registerTooltip(g1);

        };

        Draw.prototype.drawTrack = function (svg, track, y, trackID) {

            if (track === null) {
                return y;
            }


            /// console.log("drawing track " + JSON.stringify(track) + " " + y);

            // first some parameters for this view

            //var g = svg.group({id: trackID, fontWeight: 'bold', fontSize: '10', fill: 'black'});
            var g = this.getGroup(trackID);

            var seqG = this.getGroup(trackID);

            $(seqG).attr('font-family', 'Helvetica, Arial, sans-serif');
            $(seqG).attr('font-weight', 'bold');

            var mismatchGroup = svg.group({
                id: 'sMM' + trackID + this.viewer.getData().uniprotID,
                fontWeight: 'bold',
                fontSize: '10',
                fill: this.param.paired_colors[5].color
            });

            var seqresGroup = svg.group({
                id: 'seqres' + trackID,
                fontWeight: 'bold',
                fontSize: '10',
                fill: 'black'
            });

            var color = track.color;
            var bw_color = this.param.bw_colors[6];
            var mismatch_color = this.param.paired_colors[4];

            var defs = svg.defs();

            svg.linearGradient(defs, 'MyGradient' + trackID + this.viewer.getData().uniprotID, [
                    ['0%', 'white'],
                    ['100%', color]
                ],
                0, y, 0, y + this.param.trackHeight, {
                    gradientUnits: 'userSpaceOnUse'
                }
            );

            svg.linearGradient(defs, 'BWGradient' + trackID + this.viewer.getData().uniprotID, [
                    ['0%', 'white'],
                    ['100%', bw_color.color]
                ],
                0, y, 0, y + this.param.trackHeight, {
                    gradientUnits: 'userSpaceOnUse'

                }
            );

            svg.linearGradient(defs, 'BWLightGradient' + trackID + this.viewer.getData().uniprotID, [
                    ['0%', 'white'],
                    ['100%', 'grey']
                ],
                0, y, 0, y + this.param.trackHeight, {
                    gradientUnits: 'userSpaceOnUse'

                }
            );

            svg.linearGradient(defs, 'MISMGradient' + trackID + this.viewer.getData().uniprotID, [
                    ['0%', 'white'],
                    ['100%', mismatch_color.color]
                ],
                0, y, 0, y + this.param.trackHeight, {
                    gradientUnits: 'userSpaceOnUse'

                }
            );


            // now drawing the track

            this.drawName(svg, g, y, track.pdbID + "." + track.chainID,
                undefined, "Track for PDB ID " + track.pdbID +
                " chain ID " + track.chainID);

            for (var i = 0; i < track.ranges.length; i++) {
                var rangeOrig = track.ranges[i];

                var range = {};
                range.start = rangeOrig.start - 1;
                range.end = rangeOrig.end - 1;
                range.observed = rangeOrig.observed;
                range.mismatch = rangeOrig.mismatch;

                var width = (range.end - range.start) + 1;

                var r1 = this.param.trackHeight / 2 - 1;
                var r2 = this.param.trackHeight / 2 - 1;

                if (range.observed) {

                    if (range.mismatch) {

                        var rect1 = svg.rect(g, this.seq2Screen(range.start), y,
                            Math.round(width * this.scale), this.param.trackHeight, {
                                fill: 'url(#MISMGradient' + trackID + this.viewer.getData().uniprotID + ')',
                                stroke: mismatch_color.darkercolor,
                                strokeWidth: 1
                            });


                        var txt = " (sequence position: " + rangeOrig.start;
                        if (rangeOrig.start !== rangeOrig.end) {
                            txt += " - " + rangeOrig.end;
                        }
                        txt += ") ";

                        if (typeof rangeOrig.pdbStart !== 'undefined') {
                            txt += '(PDB residue:' + rangeOrig.pdbStart;
                            if (rangeOrig.pdbStart !== rangeOrig.pdbEnd) {
                                txt += '-' + rangeOrig.pdbEnd;
                            }
                            txt += ") ";
                        }

                        var aa = "";

                        if (typeof rangeOrig.pdbResidue !== 'undefined') {
                            aa = rangeOrig.pdbResidue;
                        }


                        var mmtitle = "Mismatch " +
                            this.viewer.getData().sequence.charAt(range.start) +
                            "->" + aa +
                            " between PDB and UniProt residue " + txt;

                        $(rect1).attr("title", mmtitle);

                        this.registerTooltip(rect1);

                        if (this.scale > 8) {


                            // this gives the UP sequence, but here is a mismatch
                            // this.viewer.getData().sequence.charAt(s)
                            // need to show the PDB sequence...


                            var txtm = svg.text(mismatchGroup, this.seq2Screen(range.start) + 1, y +
                                this.param.trackHeight - 1, aa);
                            $(txtm).attr("title", mmtitle);
                            this.registerTooltip(txtm);

                        }

                    } else {

                        var rect = svg.rect(g, this.seq2Screen(range.start), y,
                            Math.round(width * this.scale), this.param.trackHeight,
                            r1, r2, {
                                fill: 'url(#MyGradient' + trackID + this.viewer.getData().uniprotID + ')',
                                stroke: color,
                                strokeWidth: 1
                            });

                        var resolution = "";
                        if (typeof track.resolution !== 'undefined') {
                            resolution = " - " + (track.resolution / 1000) + " " + '\u00C5';
                        }
                        var d = new Date(track.releaseDate);

                        var title = "PDB ID " + track.pdbID + " chain " +
                            track.chainID + " - " +
                            track.desc + " (sequence position: " + rangeOrig.start + "-" + rangeOrig.end + ") ";
                        if (typeof rangeOrig.pdbStart !== 'undefined') {
                            title += '(PDB residue: ' + rangeOrig.pdbStart;

                            if (rangeOrig.pdbEnd !== rangeOrig.pdbStart) {
                                title += '-' + rangeOrig.pdbEnd;
                            }
                            title += ") ";
                        }
                        title += resolution + " - " + d.toDateString();


                        $(rect).attr("title", title);

                        this.registerTooltip(rect);

                        if (this.scale > 8) {


                            for (var s1 = range.start; s1 <= range.end; s1++) {

                                // this gives the UP sequence, but here is a mismatch
                                // this.viewer.getData().sequence.charAt(s)
                                // need to show the PDB sequence...
                                var aam = this.viewer.getData().sequence.charAt(s1);

                                svg.text(seqG, this.seq2Screen(s1) + 1, y +
                                    this.param.trackHeight - 1, aam);

                                //todo: add tooltip for text here?

                            }

                        }

                    }
                } else {

                    // shows SEQRES that are not in ATOM records.

                    if (this.viewer.getShowSeqres()) {

                        var mg = g;

                        var seqresY = (this.param.trackHeight / 4);
                        var seqresHeight = (this.param.trackHeight / 4) * 2;
                        var gradient = 'url(#BWGradient';
                        if (this.scale > 8) {
                            mg = seqresGroup;
                            seqresY = 0;
                            seqresHeight = this.param.trackHeight;
                            gradient = 'url(#BWLightGradient';

                        }


                        var line = svg.rect(mg, this.seq2Screen(range.start), y + seqresY,
                            Math.round(width * this.scale), seqresHeight,

                            {
                                fill: gradient + trackID + this.viewer.getData().uniprotID + ')',
                                stroke: bw_color.color,
                                strokeWidth: 1
                            });


                        $(line).attr("title", "No coordinates have been " +
                            "determined for region (" + range.start + "-" + range.end + "), " +
                            "but the sequence is recorded in the SEQRES records. ");

                        this.registerTooltip(line);

                        if (this.scale > 8) {

                            for (var s3 = range.start; s3 <= range.end; s3++) {

                                // this gives the UP sequence, but here is a mismatch
                                // this.viewer.getData().sequence.charAt(s)
                                // need to show the PDB sequence...
                                var aas = this.viewer.getData().sequence.charAt(s3).toLowerCase();

                                svg.text(mg, this.seq2Screen(s3) + 2, y +
                                    this.param.trackHeight - 1, aas);

                                //todo: add tooltip for text here?
                            }


                        }
                    }
                }
            }


            if (typeof track.seqdiff !== 'undefined') {
                this.drawSeqDiff(svg, track, y, trackID);
            }


            return y + this.height;

        };


        /** Provides more detailed info about sequence mismatches
         */
        Draw.prototype.drawSeqDiff = function (svg, track, y, trackID) {

            if (typeof track.seqdiff === 'undefined') {
                return;
            }

            if (track.seqdiff.length < 1) {
                return;
            }

            var colorPos = 0;
            var mycolors = this.param.up_colors;

            var siteTrackHeight = this.param.trackHeight;
            var baseLineHeight = this.param.baseLineHeight;

            var g = svg.group({
                id: trackID,
                fontWeight: 'bold',
                fontSize: '10',
                fill: 'black'
            });


            for (var i = 0; i < track.seqdiff.length; i++) {
                // draw a tick..

                var feature = track.seqdiff[i];

                if (typeof feature.uniprot !== 'undefined' && (feature.uniprot !== this.viewer.getData().uniprotID)) {
                    // this is an issue for fusion proteins, where a PDB chain can map
                    // to more than one UniProt entry.
                    continue;
                }


                var detail = "";
                var title = "";
                if (typeof feature.detail !== 'undefined') {

                    detail = feature.detail.toUpperCase();
                    title = feature.detail;
                }

                var color = colorDict[detail];

                if (typeof feature.aa !== 'undefined') {
                    title += ' ' + feature.aa;
                }
                title += ' at ' + feature.pdbID + "." + feature.chainID + ' PDB residue:' +
                    feature.pdbStart + ' sequence position: ' + feature.start;

                title += " " + feature.uniprot;

                if (detail === 'CONFLICT') {
                    color = this.param.conflictColor;
                }

                var shortText = "";
                var fontSize = 8;
                var xCorrection = -3;
                var yCorrection = 0;
                var shape = 'circle';

                if (detail.indexOf('MODIFIED') === 0) {
                    shortText = feature.aa;
                    fontSize = 6;
                    xCorrection = -6;
                } else if (detail.indexOf('MICROHETEROGENEITY') === 0) {
                    shortText = '<>';
                    fontSize = 6;
                    xCorrection = -4;
                    yCorrection = -1;
                } else if (detail.indexOf('CLONING') === 0) {
                    shortText = "C";
                } else if (detail.indexOf('GAP') === 0) {
                    shortText = "";
                    shape = 'triangle';
                } else if (detail.indexOf('INITIAL METH') === 0) {
                    shortText = feature.aa;
                    xCorrection = -6;
                    fontSize = 6;
                } else if (detail.indexOf('CHROMOPHORE') === 0) {
                    shortText = feature.aa;
                    fontSize = 6;
                    xCorrection = -6;
                } else if (detail.indexOf('ENGINEERED') === 0) {
                    shortText = "E";
                } else if (detail.indexOf('MUTATION') > -1) {
                    shortText = "M";
                } else if (detail.indexOf(' TAG') > -1) {
                    shortText = "T";
                    color = this.param.expressionTagColor;

                } else if (detail.indexOf('DELETION') > -1) {
                    shortText = "";
                    shape = 'triangle';
                    color = this.param.deletionColor;
                } else if (detail.indexOf('INSERTION') > -1) {
                    shortText = "";
                    shape = 'triangle-up';
                    color = this.param.deletionColor;
                }


                if (typeof color === 'undefined') {
                    colorPos++;
                    if (colorPos > mycolors.length - 1) {
                        colorPos = 0;
                    }
                    color = mycolors[colorPos];
                    colorDict[detail] = color;

                }

                //console.log("setting color for " + detail + " " + color.darkercolor);

                var xpos = this.seq2Screen(feature.start) - this.scale / 2;

                // if ( this.scale > 8 ) {
                //     xpos = this.seq2Screen(feature.start) ;
                // }

                svg.radialGradient(g, 'seqDiffGradient' + i + this.viewer.getData().uniprotID, [
                        ['0%', color.lightercolor],
                        ['100%', color.color]
                    ],
                    //0,y,0, y+ trackHeight,
                    xpos, y + baseLineHeight - 4, 4,
                    xpos, y + baseLineHeight - 3, {
                        gradientUnits: 'userSpaceOnUse'

                    }
                );


                if (shape === 'triangle') {

                    xpos = this.seq2Screen(feature.start) + this.scale / 2;

                    var w2 = this.scale / 2;
                    var tri = svg.polygon(g, [
                        [xpos - w2, y - baseLineHeight],
                        [xpos + 1, y + baseLineHeight + 2],
                        [xpos + w2 + 1, y - baseLineHeight]
                    ], {
                        fill: 'url(#seqDiffGradient' + i + this.viewer.getData().uniprotID + ')',
                        stroke: color.darkerColor,
                        strokeWidth: 1
                    });
                    $(tri).attr("title", title);
                    this.registerTooltip(tri);

                } else if (shape === 'triangle-up') {

                    xpos = this.seq2Screen(feature.start) + this.scale / 2;

                    var w3 = this.scale / 2;
                    var tru = svg.polygon(g, [
                        [xpos - w3, y + baseLineHeight + 2],
                        [xpos + 1, y - baseLineHeight],
                        [xpos + w3 + 1, y + baseLineHeight + 2]
                    ], {
                        fill: 'url(#seqDiffGradient' + i + this.viewer.getData().uniprotID + ')',
                        stroke: color.darkerColor,
                        strokeWidth: 1
                    });
                    $(tru).attr("title", title);
                    this.registerTooltip(tru);

                } else {

                    var circle = svg.circle(g, xpos, y, 4, {
                        fill: 'url(#seqDiffGradient' + i + this.viewer.getData().uniprotID + ')',
                        stroke: color.darkerColor,
                        strokeWidth: 1
                    });
                    $(circle).attr("title", title);
                    this.registerTooltip(circle);


                }

                var rect = svg.rect(g, xpos, y + baseLineHeight,
                    2, siteTrackHeight - baseLineHeight, {
                        fill: 'black'
                    });
                $(rect).attr("title", title);
                this.registerTooltip(rect);


                if (shortText.length > 0) {

                    // draw a tiny E...

                    var txt = svg.text(g, xpos + xCorrection, y + yCorrection + siteTrackHeight / 4,
                        shortText, {
                            'font-size': fontSize
                        });
                    $(txt).attr("title", title);
                    this.registerTooltip(txt);

                }


            }


        };


        /** Draws Site residues.
         *
         * @param svg
         * @param track
         * @param y
         * @param trackID
         * @param mycolors
         * @param orientation - should the site-arrows point upwards or downwards? either 'up' or 'down'
         * @param siteTrackHeight
         * @param modalFunction (optional) used to show a modal window if user clicks on track
         */
        Draw.prototype.drawSiteResidues = function (svg, feature, y, trackID,
                                                    mycolors, orientation, siteTrackHeight,
                                                    modalFunction) {


            if (typeof feature.tracks === 'undefined') {
                return;
            }

            if (feature.tracks.length < 1) {
                return;
            }

            var baseLineHeight = this.param.baseLineHeight;

            var colorPos = 0;
            var g = svg.group({
                id: trackID,
                fontWeight: 'bold',
                fontSize: '10',
                fill: 'black'
            });

            // draw features base line...
            var defs1 = svg.defs();

            var isPhospho = false;
            // color gradient of base line. Default .. UP color
            var gcolor = this.param.paired_colors[2];
            if (feature.label === 'PDB SITES residues') {
                // PDB color...
                gcolor = this.param.paired_colors[1];
            } else if (feature.label.indexOf('Phosphosite') !== -1) {
                gcolor = this.param.paired_colors[9];
                isPhospho = true;
            }

            var rect1 = {};

            if (orientation === 'up') {

                svg.linearGradient(defs1, 'sequenceSite' + trackID + this.viewer.getData().uniprotID, [
                        ['0%', gcolor.color],
                        ['100%', gcolor.darkercolor]
                    ],
                    0, y + siteTrackHeight - baseLineHeight, 0, y + siteTrackHeight, {
                        gradientUnits: 'userSpaceOnUse'

                    }
                );
                rect1 = svg.rect(g, this.seq2Screen(0), y + siteTrackHeight - baseLineHeight,
                    this.viewer.getSequence().length * this.scale, baseLineHeight,
                    4, 4, {
                        fill: 'url(#sequenceSite' + trackID + this.viewer.getData().uniprotID + ')',
                        stroke: gcolor.darkercolor,
                        strokeWidth: 1
                    });
            } else {
                svg.linearGradient(defs1, 'sequenceSite' + trackID + this.viewer.getData().uniprotID, [
                        ['0%', gcolor.color],
                        ['100%', gcolor.darkercolor]
                    ],
                    0, y, 0, y + baseLineHeight, {
                        gradientUnits: 'userSpaceOnUse'

                    }
                );

                rect1 = svg.rect(g, this.seq2Screen(0), y,
                    this.viewer.getSequence().length * this.scale, baseLineHeight,
                    4, 4, {
                        fill: 'url(#sequenceSite' + trackID + this.viewer.getData().uniprotID + ')',
                        stroke: gcolor.darkercolor,
                        strokeWidth: 1
                    });
            }


            $(rect1).attr("title", feature.label + ' track for ' +
                feature.tracks[0].pdbID + "." + feature.tracks[0].chainID);
            this.registerTooltip(rect1);


            for (var i = 0; i < feature.tracks.length; i++) {
                var site = feature.tracks[i];
                if (typeof site === 'undefined') {
                    continue;
                }

                var color = colorDict[site.name];


                if (feature.label === "wwPDB validation report data") {
                    // PDB validation records.
                    // the color code is int the desc field

                    var defcolor = site.desc;

                    color = defcolor;
                }


                if (typeof color === 'undefined') {
                    colorPos++;
                    if (colorPos > mycolors.length - 1) {
                        colorPos = 0;
                    }
                    color = mycolors[colorPos];
                    colorDict[site.name] = color;
                    //console.log("setting new color for " + site.name + " " + color.color);
                }


                if (orientation === 'up') {
                    svg.radialGradient(g, 'siteWGradient' + i + this.viewer.getData().uniprotID, [
                            ['0%', color.lightercolor],
                            ['100%', color.color]
                        ],
                        //0,y,0, y+ trackHeight,
                        this.seq2Screen(site.start) - this.scale / 2, y + baseLineHeight - 4, 4,
                        this.seq2Screen(site.start) - this.scale / 2, y + baseLineHeight - 3, {
                            gradientUnits: 'userSpaceOnUse'

                        }
                    );
                } else {
                    svg.radialGradient(g, 'siteWGradient' + i + this.viewer.getData().uniprotID, [
                            ['0%', color.lightercolor],
                            ['100%', color.color]
                        ],
                        //0,y,0, y+ trackHeight,
                        this.seq2Screen(site.start) - this.scale / 2, y + siteTrackHeight - 4, 4,
                        this.seq2Screen(site.start) - this.scale / 2, y + siteTrackHeight - 3, {
                            gradientUnits: 'userSpaceOnUse'

                        }
                    );
                }

                //

                var rect = {};
                var circle = {};

                if (orientation === 'up') {
                    rect = svg.rect(g, this.seq2Screen(site.start) - this.scale / 2, y + baseLineHeight,
                        2, siteTrackHeight - baseLineHeight, {
                            fill: 'black'
                        });
                    circle = svg.circle(g, this.seq2Screen(site.start) - this.scale / 2, y, 4, {
                        fill: 'url(#siteWGradient' + i + this.viewer.getData().uniprotID + ')',
                        stroke: color.darkerColor,
                        strokeWidth: 1
                    });
                } else {
                    rect = svg.rect(g, this.seq2Screen(site.start) - this.scale / 2, y, 2, siteTrackHeight, {
                        fill: 'black'
                    });

                    circle = svg.circle(g, this.seq2Screen(site.start) - this.scale / 2,
                        y + siteTrackHeight - 4, 4, {
                            fill: 'url(#siteWGradient' + i + this.viewer.getData().uniprotID + ')',
                            stroke: color.darkerColor,
                            strokeWidth: 1
                        });
                }

                var pdbInfo = "";

                if ((typeof feature.tracks[0].pdbID) === 'string') {

                    pdbInfo = feature.tracks[0].pdbID + "." + feature.tracks[0].chainID + ": ";

                } else {
                    //console.log( " did not find PDB ID for track " +
                    //JSON.stringify(feature.tracks[0]) + " " +
                    //(typeof feature.tracks[0].pdbID  ));

                }


                var title1 = pdbInfo;

                if (typeof site.desc !== 'undefined') {
                    title1 += site.desc;
                }

                if (typeof site.name !== 'undefined') {
                    title1 += " - " + site.name;
                }

                title1 += " (" + site.start + ")";

                $(rect).attr("title", title1);
                this.registerTooltip(rect);

                $(circle).attr("title", title1);


                if (feature.trackName !== 'undefined' && feature.trackName === 'variation') {
                    var extLinks = site.externalLinks;

                    if (typeof extLinks !== 'undefined' && extLinks !== "" && extLinks.length > 0) {
                        $(circle).data("extLinks", site.externalLinks);
                    }
                }
                this.registerTooltip(circle);

                if (isPhospho) {

                    $(circle).attr("id", site.acc);
                    $(circle).attr("name", this.title);

                }

                if (typeof modalFunction !== 'undefined') {
                    $(circle).css('cursor', 'pointer');
                    //// need to pass site info in..

                    $(circle).bind('click', $.proxy(modalFunction, this, site));
                }


            }
        };

        Draw.prototype.drawUniprotChainData = function (svg, y, callback) {

            var chains = this.viewer.getData().chains;

            var rows = this.breakTrackInRows(chains.tracks);

            if (rows < 1) {
                return y;
            }

            y = this.drawGenericTrack(svg, rows, y, 'Molec. Processing', 'chainTrack',
                this.param.up_colors, undefined, callback, this.viewer.getData().chains.label);

            return y;

        };


        Draw.prototype.drawTick = function (svg, seqpos, y, height) {

            var g = svg.group({
                fontWeight: 'normal',
                fontSize: 10,
                fill: 'black'
            });
            svg.text(g, this.seq2Screen(seqpos), y - 2 - 1, (seqpos + 1) + "");
            svg.rect(this.seq2Screen(seqpos), y, 1 * this.scale, height, {
                fill: 'black'
            });

        };


        Draw.prototype.drawUniprotFeatures = function (svg, y) {

            var callback = this.popups.callbackUniProtFeature;


            if (typeof this.viewer.getData().chains !== 'undefined') {

                y = this.drawUniprotChainData(svg, y, callback);

            }

            if (
                (typeof this.viewer.getData().motifs !== 'undefined') &&
                (typeof this.viewer.getData().motifs.tracks !== 'undefined')
            ) {


                var motifs = this.viewer.getData().motifs.tracks;

                var motifrows = this.breakTrackInRows(motifs);

                //alert(" motif has " + motifrows.length + " rows" + JSON.stringify(motifrows));

                y = this.drawGenericTrack(svg, motifrows, y, 'Motif', 'motifTrack',
                    this.param.up_colors, undefined, callback, this.viewer.getData().motifs.label);

            }

            if ((typeof this.viewer.getData().enzymeClassification !== 'undefined') &&
                (this.viewer.getData().enzymeClassification.tracks.length > 0)) {

                var ecs = this.viewer.getData().enzymeClassification.tracks;

                var ecrows = this.breakTrackInRows(ecs);

                y = this.drawRangedTrack(svg, ecrows, y, 'E.C.', 'enzymeClassificationTrack',
                    this.param.up_colors, undefined, this.popups.callbackec, this.viewer.getData().enzymeClassification.label);

            }

            return y + this.param.trackHeight;

        };


        Draw.prototype.drawPDBSecstruc = function (svg, y) {


            var secstruc = this.viewer.getData().secstruc;

            if (typeof secstruc === 'undefined') {
                return y;
            }

            y = this.drawSecstrucTrack(svg, secstruc, y);

            return y + this.param.trackHeight;

        };

        Draw.prototype.drawSecstrucTrack = function (svg, trackdata, y) {


            if (typeof trackdata === 'undefined') {
                return y;
            }

            if (typeof trackdata.tracks === 'undefined') {
                return y;
            }

            var callback = this.popups.callbackSecStruc;

            var trackName = 'Secstruc';
            var label = trackdata.label;


            var g0 = this.getGroup(label + this.viewer.getData().uniprotID);

            if (this.viewer.getData().tracks.length > 0) {
                this.drawName(svg, g0, y, trackName, undefined, label);
            }

            // draw black line in background
            var bw_color = this.param.bw_colors[0];
            svg.linearGradient(svg.defs(), 'secstrucBWGradient' + this.viewer.getData().uniprotID, [
                    ['0%', 'white'],
                    ['100%', bw_color]
                ],
                0, y, 0, y + this.param.trackHeight, {
                    gradientUnits: 'userSpaceOnUse'
                }
            );

            for (var j = 0; j < this.viewer.getData().tracks.length; j++) {
                var track = this.viewer.getData().tracks[j];
                if (track === null) {
                    continue;
                }
                for (var i = 0; i < track.ranges.length; i++) {
                    var rangeOrig = track.ranges[i];

                    if (!rangeOrig.observed) {
                        continue;
                    }

                    var range = {};
                    range.start = rangeOrig.start - 1;
                    range.end = rangeOrig.end - 1;
                    range.name = "secstruc";
                    range.desc = "coil";

                    var width = (range.end - range.start) + 1;

                    var line = svg.rect(g0,
                        this.seq2Screen(range.start),
                        y + (this.param.trackHeight / 4),
                        Math.round(width * this.scale),
                        (this.param.trackHeight / 4) * 2,

                        {
                            fill: 'url(#secstrucBWGradient' + this.viewer.getData().uniprotID + ')',

                        });

                    $(line).attr("title", 'coil');


                    //$(line).bind('mouseover', this.popuptooltipMethod);
                    //$(line).mouseout(this.mouseoutMethod);
                    //$(line).css('cursor','pointer');
                    this.registerTooltip(line);
                    if (typeof callback !== 'undefined') {
                        $(line).css('cursor', 'pointer');
                        $(line).bind('click', $.proxy(callback, this, range));

                    }
                }
            }

            for (var i1 = 0; i1 < trackdata.tracks.length; i1++) {
                var rangeOrig1 = trackdata.tracks[i1];

                var range1 = {};
                range1.start = rangeOrig1.start - 1;
                range1.end = rangeOrig1.end - 1;
                range1.name = rangeOrig1.name;
                range1.desc = rangeOrig1.desc;
                range1.note = rangeOrig1.note;

                var width1 = (range1.end - range1.start) + 1;


                if (range1.end > this.viewer.getData().length) {
                    // probably a chimera protein, we can't deal with those currently
                    continue;
                }

                var color = this.param.bw_colors[3]; // grey

                if (range1.name === 'H' || range1.name === 'I' || range1.name === 'G') {
                    color = this.param.paired_colors[5];
                } else if (range1.name === 'E' || range1.name === 'B') {
                    color = this.param.paired_colors[6];
                } else if (range1.name === 'T') {
                    color = this.param.paired_colors[0];
                }


                //alert(JSON.stringify(color));
                var x1 = this.seq2Screen(range1.start);

                var defs2 = svg.defs();
                svg.linearGradient(defs2, trackName + 'GR' + i1 + this.viewer.getData().uniprotID, [
                        ['0%', color.lightercolor],
                        ['100%', color.darkercolor]
                    ],
                    0, y, 0, y + this.param.trackHeight, {
                        gradientUnits: 'userSpaceOnUse'

                    }
                );

                var g2 = svg.group({
                    id: trackName + this.viewer.getData().uniprotID,
                    fontWeight: 'bold',
                    fontSize: '10',
                    fill: color.textcolor
                });

                var rect = {};
                if (range1.name === 'H' || range1.name === 'G' ||
                    range1.name === 'I' || range1.name === 'E') {

                    rect = svg.rect(g2, x1, y, width1 * this.scale, this.param.trackHeight,
                        0, 0, {
                            fill: 'url(#' + trackName + 'GR' + i1 + this.viewer.getData().uniprotID + ')',
                            stroke: color.darkercolor,
                            strokeWidth: 1
                        });
                } else {
                    // a smaller box (moved 1 pix to the left so an adjacent
                    //large box looks more dominant
                    rect = svg.rect(g0, x1 + 1, y + (this.param.trackHeight / 8),
                        width1 * this.scale, (this.param.trackHeight / 8) * 7,
                        0, 0, {
                            fill: 'url(#' + trackName + 'GR' + i1 + this.viewer.getData().uniprotID + ')',
                            stroke: color.darkercolor,
                            strokeWidth: 1
                        });


                }

                if (range1.name === 'H') {
                    for (var xl = x1; xl < (this.seq2Screen(range1.end)); xl += 4) {
                        svg.line(g0, xl, y + this.param.trackHeight, xl + 4, y, {
                            fill: color.darkercolor,
                            stroke: color.darkercolor
                        });

                    }
                }


                var t = range1.desc;
                if (typeof range1.desc === 'undefined') {
                    t = range1.name;
                }
                if (typeof range1.note !== 'undefined') {
                    t += " (from " + range1.note + ")";
                }
                var title = t + " (" + rangeOrig1.start + "-" + rangeOrig1.end + ")";
                $(rect).attr('title', title);

                //$(rect).bind('mouseover', this.popuptooltipMethod);
                //$(rect).mouseout(this.mouseoutMethod);
                //$(rect).css('cursor','pointer');
                //console.log(rect);
                //this.registerTooltip(rect);
                if (typeof callback !== 'undefined') {
                    $(rect).css('cursor', 'pointer');
                    $(rect).bind('click', $.proxy(callback, this, range1));

                    this.registerTooltip(rect);
                }

            }

            return y + this.param.trackHeight;

        };


        /** Draws a 'ranged' track. I.e. it indicated start and stop positions
         *
         * @param svg
         * @param rows
         * @param y
         * @param label
         * @param trackName
         * @param mycolors
         * @param url
         * @param callbackFunction
         * @returns
         */
        Draw.prototype.drawRangedTrack = function (svg, rows, y, label,
                                                   trackName, mycolors, url, callbackFunction, info) {


            if (rows.length === 0) {
                return y;
            }

            var newLocationMethod = function () {
                document.location.href = url;
            };


            var colorPos = -1;
            // var g0 = svg.group({
            //         id: label + this.viewer.getData().uniprotID,
            //         fontWeight: 'bold',
            //         fontSize: '10', fill: 'black'
            //     }
            // );

            var g0 = this.getGroup(label + this.viewer.getData().uniprotID);

            this.drawName(svg, g0, y, label, undefined, info);

            for (var j = 0; j < rows.length; j++) {

                var row = rows[j];

                for (var i = 0; i < row.length; i++) {

                    try {
                        var rangeOrig = row[i];

                        if (typeof rangeOrig === 'undefined') {
                            continue;
                        }

                        if (typeof rangeOrig.desc === 'undefined') {
                            continue;
                        }

                        var range = {};

                        range.start = rangeOrig.start - 1;
                        range.end = rangeOrig.end - 1;
                        range.desc = rangeOrig.desc;
                        range.name = rangeOrig.name;

                        colorPos++;
                        if (colorPos > mycolors.length - 1) {
                            colorPos = 0;
                        }

                        var color = mycolors[colorPos];
                        //alert(JSON.stringify(colorPos) + " " + JSON.stringify(mycolors));
                        var width = (range.end - range.start) + 1;

                        var x1 = this.seq2Screen(range.start);

                        var defs = svg.defs();
                        svg.linearGradient(defs, trackName + 'GR' + j + i + this.viewer.getData().uniprotID, [
                                ['0%', 'white'],
                                ['100%', color.darkercolor]
                            ],
                            0, y, 0, y + this.param.trackHeight, {
                                gradientUnits: 'userSpaceOnUse'

                            }
                        );

                        // var g = svg.group({
                        //         id: trackName + this.viewer.getData().uniprotID,
                        //         fontWeight: 'bold',
                        //         fontSize: '10',
                        //         fill: color.textcolor
                        //     }
                        // );

                        var g = this.getGroup(trackName + this.viewer.getData().uniprotID);
                        $(g).attr('fill', color.textcolor);

                        // draw vertical bars at start and stop:
                        svg.rect(g, x1, y, 1 * this.scale, this.param.trackHeight,
                            1, 1, {
                                fill: color.darkercolor,
                                stroke: color.darkercolor,
                                strokeWidth: 1
                            });

                        svg.rect(g, this.seq2Screen(range.end), y, 1 * this.scale, this.param.trackHeight,
                            1, 1, {
                                fill: color.darkercolor,
                                stroke: color.darkercolor,
                                strokeWidth: 1
                            });


                        // draw horizontal connector
                        var rect = svg.rect(g, x1, y + this.param.trackHeight / 2 - 2, width * this.scale, 4, {
                            fill: 'url(#' + trackName + 'GR' + j + i + this.viewer.getData().uniprotID + ')',
                            stroke: color.darkercolor,
                            strokeWidth: 1
                        });

                        var dispText = range.desc;

                        if (trackName === 'Homology_Models') {
                            dispText = "";
                        }

                        var txt = svg.text(g, x1 + this.scale, y + this.param.trackHeight - 1, dispText);

                        this.checkTxtLength(txt, range.start, range.end, dispText);

                        var title = range.name;

                        title += " (" + rangeOrig.start + "-" + rangeOrig.end + ")";

                        if (range.name !== range.desc) {
                            title += " - " + range.desc;
                        }

                        if (typeof range.status !== 'undefined') {
                            title += " - " + range.status;
                        }

                        $(rect).attr('title', title);
                        //$(rect).bind('mouseover', this.popuptooltipMethod);
                        //$(rect).mouseout(this.mouseoutMethod);
                        this.registerTooltip(rect);


                        $(txt).attr('title', title);
                        this.registerTooltip(txt);


                        if (typeof url !== 'undefined') {
                            $(rect).css('cursor', 'pointer');
                            $(txt).css('cursor', 'pointer');
                            $(rect).bind('click', newLocationMethod);
                            $(txt).bind('click', newLocationMethod);
                        }

                        if (typeof callbackFunction !== 'undefined') {
                            $(rect).css('cursor', 'pointer');
                            $(txt).css('cursor', 'pointer');
                            $(rect).bind('click', $.proxy(callbackFunction, this, range));
                            $(txt).bind('click', $.proxy(callbackFunction, this, range));
                        }


                    } catch (e) {
                        console.log("Problem while drawing ranged track: " + label + " " + e);
                    }
                }
                y += this.param.trackHeight + 5;
            }
            return y;

        };

        Draw.prototype.drawCytoplasmic = function (y, svg, range, trackName) {

            var ydraw = y + this.param.trackHeight - 2;
            var yheight = 2;
            this.drawTmLine(y, svg, range, trackName, ydraw, yheight);

        };

        Draw.prototype.drawPeriplasmic = function (y, svg, range, trackName) {

            var ydraw = y;
            var yheight = 2;
            this.drawTmLine(y, svg, range, trackName, ydraw, yheight);

        };

        Draw.prototype.drawTmLine = function (y, svg, range, trackName, ydraw, yheight) {

            //var red  = paired_colors[5];
            var blue = this.param.paired_colors[1];

            //cytoplasmic is a the bottom

            var g = this.getGroup(trackName + this.viewer.getData().uniprotID);

            var width = (range.end - range.start) + 1;

            var x1 = this.seq2Screen(range.start - 1);

            var rect = svg.rect(g, x1, ydraw, width * this.scale, yheight, {
                fill: blue.color,
                stroke: blue.darkercolor,
                strokeWidth: 1
            });
            var txt = svg.text(g, x1 + this.scale, y + this.param.trackHeight - 1, range.desc);
            this.checkTxtLength(txt, range.start, range.end, range.desc);

            var title = range.desc + "-" + range.name;
            if (typeof range.status !== 'undefined') {
                title += " - " + range.status;
            }

            $(rect).attr('title', title);
            this.registerTooltip(rect);

            $(txt).attr('title', title);
            this.registerTooltip(txt);


        };

        Draw.prototype.drawIntramembrane = function (y, svg, range, trackName) {

            //var red  = paired_colors[5];
            //var blue = paired_colors[1];
            var color = this.param.bw_colors[3];
            //var color = red;
            //cytoplasmic is a the bottom


            var g = this.getGroup(trackName + this.viewer.getData().uniprotID);

            var width = (range.end - range.start) + 1;

            var x1 = this.seq2Screen(range.start - 1);


            // draw a horizontal line representing the membrane
            var rect = svg.rect(g, x1, y + this.param.trackHeight / 2, width * this.scale, 2, {
                fill: color.color,
                stroke: color.darkercolor,
                strokeWidth: 1
            });

            // draw vertical bars at start and stop:
            svg.rect(g, x1, y, 1 * this.scale, this.param.trackHeight,
                1, 1, {
                    fill: color.darkercolor,
                    stroke: color.darkercolor,
                    strokeWidth: 1
                });

            svg.rect(g, this.seq2Screen(range.end - 1), y, 1 * this.scale, this.param.trackHeight,
                1, 1, {
                    fill: color.darkercolor,
                    stroke: color.darkercolor,
                    strokeWidth: 1
                });


            var txt = svg.text(g, x1 + this.scale, y + this.param.trackHeight - 1, range.desc);

            this.checkTxtLength(txt, range.start, range.end, range.desc);


            var title = range.desc + "-" + range.name;
            if (typeof range.status !== 'undefined') {
                title += " - " + range.status;
            }

            //title += " " + range.start + "-" + range.end;
            $(rect).attr('title', title);
            this.registerTooltip(rect);


            $(txt).attr('title', title);
            this.registerTooltip(txt);

        };

        Draw.prototype.drawTransmembrane = function (y, svg, range, trackName) {


            var red = this.param.paired_colors[5];
            //var blue = paired_colors[1];
            //var color = bw_colors[3];
            var color = red;
            //cytoplasmic is a the bottom

            var g = this.getGroup(trackName + this.viewer.getData().uniprotID);

            var width = (range.end - range.start) + 1;

            var x1 = this.seq2Screen(range.start - 1);

            var defs = svg.defs();

            svg.linearGradient(defs, trackName + 'TR' + this.viewer.getData().uniprotID, [
                    ['0%', color.lightercolor],
                    ['100%', color.darkercolor]
                ],
                0, y, 0, y + this.param.trackHeight, {
                    gradientUnits: 'userSpaceOnUse'

                }
            );

            // draw a horizontal line representing the membrane
            var rect = svg.rect(g, x1, y, width * this.scale, this.param.trackHeight, {
                fill: 'url(#' + trackName + 'TR' + this.viewer.getData().uniprotID + ')',
                stroke: color.darkercolor,
                strokeWidth: 1
            });

            for (var xl = x1; xl < (this.seq2Screen(range.end)); xl += 4) {
                svg.line(g, xl, y + this.param.trackHeight, xl + 2, y, {
                    fill: color.darkercolor,
                    stroke: color.darkercolor
                });

            }

            var txt = svg.text(g, x1 + this.scale, y + this.param.trackHeight - 1, range.desc);

            this.checkTxtLength(txt, range.start, range.end, range.desc);


            var title = range.desc + "-" + range.name;
            if (typeof range.status !== 'undefined') {
                title += " - " + range.status;
            }

            //title += " " + range.start + "-" + range.end;
            $(rect).attr('title', title);
            this.registerTooltip(rect);


            $(txt).attr('title', title);
            this.registerTooltip(txt);

        };


        /** break a track array that might contain overlapping tracks into multiple non-overlapping rows
         *
         */
        Draw.prototype.breakTrackInRows = function (tracks) {
            var rows = [];

            if (tracks.length < 1) {
                return rows;
            }

            // we'll have at least one row...
            var rowArr = [];
            rows.push(rowArr);

            var featureCount = 0;

            nextTrack:
                for (var i = 0; i < tracks.length; i++) {
                    var range = tracks[i];

                    // weird bug, should not happen..
                    if (typeof range === 'undefined') {
                        continue nextTrack;
                    }

                    var lowestRow = 0;

                    nextRow:
                        for (var j = 0; j < rows.length; j++) {
                            var row = rows[j];
                            var foundOverlap = false;

                            for (var k = 0; k < row.length; k++) {

                                featureCount++;

                                var f = row[k];


                                var overlap = this.getOverlap(range.start, range.end, f.start, f.end);


                                if (overlap > 0) {

                                    foundOverlap = true;
                                    lowestRow++;
                                    continue nextRow;
                                }
                            }

                            // we went through a whole row and no overlap... let's add it here..
                            if (!foundOverlap) {
                                break nextRow;
                            }

                        }
                    //if (range.start == 1029 || range.start == 1023 || range.start == 980)


                    if (rows.length < lowestRow + 1) {
                        var rowArr1 = [];
                        rows.push(rowArr1);
                    }


                    // add this range to the first row where it does not overlap anything.
                    rows[lowestRow].push(range);
                }


            return rows;
        };

        Draw.prototype.updateTrackColors = function (coloring) {

            var counter = 0;
            var colorPos = -1;


            var colors = coloring;

            if (typeof this.viewer.getData().tracks === 'undefined') {
                return;
            }
            for (var i = 0; i < this.viewer.getData().tracks.length; i++) {

                var track = this.viewer.getData().tracks[i];

                if (track === null) {
                    continue;
                }

                counter++;

                colorPos++;

                if (colorPos >= colors.length) {
                    colorPos = 0;
                }


                var colorData = this.getTrackColor(colors, colorPos, track);

                track.color = colorData.color;
                track.lightercolor = colorData.lightercolor;
            }
        };

        Draw.prototype.getTrackColor = function (colors, colorPos, track) {



            //var colorMap =this.viewer.getData().colors[colorPos];
            var colorMap = colors[colorPos];
            if (this.viewer.colorBy === "Resolution") {

                //alert(colorBy + " " + track.resolution);
                if (typeof track.resolution === 'undefined') {
                    return this.param.bw_colors[6];
                }

                var resolution = track.resolution;

                for (var i = 0; i < (this.param.redblue_colors.length - 1); i++) {

                    if (resolution < (i + 1) * 1000) {
                        //alert("i " + i + " " + resolution);
                        return this.param.redblue_colors[i];
                    }
                }

                // last one is the max resolution...
                return this.param.redblue_colors[this.param.redblue_colors.length - 1];

            } else if (this.viewer.colorBy === "Alignment Length") {
                // default is all in one color
                return colors[1];
            }
            // other
            return colorMap;


        };


        Draw.prototype.checkTxtLength = function (txt, start, end, fullText) {

            if (typeof fullText === 'undefined') {
                return;
            }

            var tlength = txt.getComputedTextLength();

            var width = end - start + 1;

            var availspace = width * this.scale;

            if (tlength > availspace) {
                // resize the text!

                // width in view divided by 10 px font size
                var max = Math.floor(availspace / 8.0);
                //console.log('avail space: ' + availspace +' px ' +
                //" new max: " + max + " " + txt.getBoundingClientRect().width + " " + tlength);
                //alert("text " + domain.name + " too long! " + max );

                txt.firstChild.data = fullText.substring(0, max);

                //txt.getBoundingClientRect().width = availspace;

                //txt.setBoundingClientRect()
                //tlength = txt.getComputedTextLength();
            }

        };


        /** Count the number of positions that are overlapping the two ranges xs-ys and as-bs
         *
         */
        Draw.prototype.getOverlap = function (x, y, a, b) {

            var overlap = 0;
            //1: do we overlap?

            if (
                (
                    // 2nd starts in range of 1st
                    (x <= a) && (a <= y)
                ) ||
                (
                    // 2nd ends in range of 1st
                    (x <= b) && (b <= y)
                ) ||
                // 1st is contained in 2nd
                (a <= x && y <= b)
            ) {

                //2: how much is it?

                if (x < a) {
                    if (y < b) {
                        overlap = y - a;
                    } else {
                        overlap = b - a;
                    }
                } else {
                    if (y < b) {
                        overlap = y - x;
                    } else {
                        overlap = b - x;
                    }

                }

            }

            return overlap;
        };

        /** Set the scale of the current display. The value is the amount of
         * space given for rendering one amino acid.
         *
         * @param aaWidth - width of one amino acid
         */
        Draw.prototype.setScale = function (aaWidth) {

            // console.log("draw: set scale  " + aaWidth);

            if (aaWidth > this.param.maxTextSize) {
                aaWidth = this.param.maxTextSize;
            }

            this.scale = aaWidth;


        };

        Draw.prototype.registerTooltip = function (element, title) {

            try {
                if (typeof title === 'undefined') {
                    title = $(element).attr('title');
                }

                if (typeof element === 'undefined') {
                    console.err("got undefined for element?? " + title);
                }

                if (typeof $(element) === 'undefined') {
                    console.err("got undefined for element?? " + element + " " + title);
                }

                $(element).attr({
                    'rel': 'tooltip',
                    'title': title,
                    'data-toggle': 'tooltip',
                    'data-container': 'body'
                });

                $(element).css('cursor', 'pointer');

                //$(element).tooltip();

            } catch (err) {
                console.log("could not register tooltip for " + JSON.stringify(element) + " " + JSON.stringify(title));
                console.log(err);
            }
        };

        return {
            Draw: function (viewer) {
                return new Draw(viewer);
            }
        };

    });

/* -*- mode: javascript; c-basic-offset: 4; indent-tabs-mode: nil -*- */
/*global $:false */
/*global pageTracker:false*/
/*jslint maxlen: 120 */
/**
 *  Protein Feature View v. 1.0.1 build 295
 *
 *  Draws a graphical summary of PDB and UniProtKB relationships for a single UniProtKB sequence.
 *
 *  @author Andreas Prlic
 */


define('viewer', ['colors', 'draw', 'params', 'icons', 'popups'],
    function (colors, draw, params, icons, popups) {
        /**
         * A No args constructor. Needs to call setParent and loadUniprot from the user side
         */
        function Viewer() {
            this.initClass();
            var that = this;
            $(window).resize(function () {
                $(that.parent).css('overflow', 'hidden');
                $(that.parent).css('width', 'auto');
                //$(parent).removeAttr('css');
                var shouldRepaint = that.updateScale();
                if (shouldRepaint) {
                    that.repaint();
                }
            });

            var drawer = new draw.Draw(this);
            this.drawer = drawer;
            this.params = params;
            this.icons = icons;
            this.popups = new popups.Popups();

            this.popups.init(this, this.rcsbServer);
        }

        /** Initialize the internals
         *
         */
        Viewer.prototype.initClass = function () {


            $.ajaxSetup({
                timeout: 20000
            });

            this.data = {};

            this.version = "v. 1.0.1 build 295";

            this._initialized = false;

            this.showCondensed = true;

            this.colorBy = "Alignment Length";

            this.defaultSort = "Alignment Length";

            this.showSeqres = true;
            this.singlePDBmode = false;
            this.displayPDB = "";
            this.addedPDB = [];

            this.contentDiv = "#content";
            this.dialogDiv = "#dialog";
            this.scrollBarDiv = "#svgScrollBar";

            this.selectionStart = -1;
            this.selectionEnd = -1;

            this.masterURL = "/pdb/protein/";

            // TODO: instead of blank, added in rcsb.org
            this.rcsbServer = "//www.rcsb.org";

            this.listenerMap = {};

            this.oldScale = -1;

            this.previousY = 0;
            // for flagging which track is shown in 3D
            this.pdbIn3d = "";
            this.chainIn3d = "";

            try {
                $(this.scrollBarDiv).slider({
                    handle: 'round',
                    enabled: 'true',
                    natural_arrow_keys: 'true',
                    formatter: function (value) {
                        return 'zoom: ' + value + '%';
                    }

                });
            } catch (err) {
                console.error(err);
            }

            this.startedAt = new Date().getTime();

            //$(this.scrollBarDiv).bind('slidechange', $.proxy( this, 'srcollValueChanged' ));

            console.log("*** Protein Feature View V." + this.version + " ***");

        };

        Viewer.prototype.getVersion = function () {
            return this.version;
        };


        Viewer.prototype.setUniprotId = function (uniprotId) {
            this.uniprotID = uniprotId;
        };

        Viewer.prototype.loadUniprot = function (uniprotId) {
        	  console.log("trigger loading of ",uniprotId);
            this.uniprotID = uniprotId;
            if (typeof uniprotId === 'undefined') {
                return;
            }
            this.data = {};
            var url = this.rcsbServer + this.masterURL + this.uniprotID + "?type=json";
            if (this.singlePDBmode) {
                url += "&display=" + this.displayPDB;
            }
            if (this.addedPDB.length > 0) {
                url += "&addPDB=";

                for (var a = 0; a < this.addedPDB.length; a++) {
                    url += this.addedPDB[a];
                    if (a > 0 && a < this.addedPDB.length - 1) {
                        url += ",";
                    }
                }
                console.log("load uniprot url ?");
                console.log(url);

            }
            var that = this;
            $.getJSON(url, function (json) {
                console.log("got json response from " + url);
                
                that.setData(json);
                $(that.parent).svg();
                var svg = that.getSVGWrapper();
                that.drawInitial(svg);
                that.updateScale();
                that.repaint();
								
								console.log("done ");
                
            });
            this.registerEvents();
        };


        Viewer.prototype.registerEvents = function () {

            var that = this;
            $(this.parent).bind('click',
                $.proxy(
                    function (path) {

                        var g = path.target.parentNode;
                        var id = g.id;

                        console.log("user clicked >" + id + "<");

                        if (id === "") {
                            // user clicked somewhere on the screen..

                            var svg = this.getSVGWrapper();

                            var offset = $(svg.root()).offset();

                            var x = path.pageX - offset.left;

                            //var y = path.pageY - offset.top;
                            var seqPos = this.drawer.screen2Seq(x) - 1;

                            if (seqPos > this.data.sequence.length) {
                                seqPos = -1;
                            }

                            this.popups.showSequenceDialog(path);

                            if (seqPos >= 0) {
                                //this.highlight(seqPos,seqPos);
                            }

                        }

                        if (id.indexOf('pfam') > -1) {

                            var pfampos = id.substring(4, id.length);
                            if (pfampos !== 'track') {
                                this.popups.showPfamDialog(that.data.pfam.tracks[pfampos]);
                            }
                        } else if (id.indexOf('seq') > -1) {

                            this.popups.showSequenceDialog(path);

                        } else if (id.indexOf('exon') > -1) {

                            var exonpos = id.substring(4, id.length);

                            // console.log("clicked on exon " + id + " " + exonpos);

                            if (exonpos !== 'track') {
                                this.popups.showExonDialog(that.data.exon.tracks[exonpos]);
                            }
                        } else if (id.indexOf('Secstruc') > -1) {
                            // user clicked on a secondary structure element
                            //this.popups.showSequenceDialog(path);
                            // now handled as custom event
                        } else if (id >= 0) {

                            var track = this.data.tracks[id];

                            this.popups.showDialog(track, path);

                            // notify listeners that user clicked on PDB ID track name
                            this._dispatchEvent({
                                    'name': 'pdbTrackNameClicked'
                                },
                                'pdbTrackNameClicked', track);

                        }

                    }, this
                )
            );


            $(this.scrollBarDiv).on('slide', $.proxy(this, 'scrollValueChanged'));
            $(this.scrollBarDiv).on('slideStop', $.proxy(this, 'scrollReleased'));


        };


        Viewer.prototype.scrollValueChanged = function () {

            // this._dispatchEvent({'name':'sliderMovedEvent'},
            //     'sliderMoved', {'percent':viewPercent});
        };

        Viewer.prototype.scrollReleased = function (event) {

            this.setScrollValue(event.value);

            this._dispatchEvent({
                    'name': 'sliderReleased'
                },
                'sliderReleased', {
                    'percent': event.value
                });
        };


        Viewer.prototype.setScrollValue = function (val) {
            if (val < 0) {
                val = 0;
            } else if (val > 100) {
                val = 100;
            }

            // console.log("setting scroll value to " + val);

            var minScale = this.getMinScale();
            //
            var maxScale = this.params.maxTextSize;
            //
            var tmpMax = maxScale - minScale;

            // the user wants X percent to be visible

            //var hundredPerc = maxTextSize * sequence.length  ;

            var newScale = minScale + tmpMax * (val / 100.0);

            //$(this.scrollBarDiv).slider().slider("setValue", val);

            this.setScale(newScale);

            this.repaint();


        };


        /** set the URL to load the main data from. Can be used to specify a remote server.
         *
         * @param url
         */
        Viewer.prototype.setMasterURL = function (url) {
            this.masterURL = url;
        };

        /** Configure which tracks to display. The passed parameter should be a JSON
         object of this style (that's just an example):
         *
         * var tracks = [ { 'name':'pdbsites',
    'url':'/pdb/protein/'+uniprotID+'?type=json&track=pdbsites&display=' + displayPDB
                      },
         {  'name':'SCOP',
        'url':'/pdb/protein/'+uniprotID+'?type=json&track=scop&display=' + displayPDB
                          }] ;
         *
         * Note: if you get this configuration wrong, This won't work correctly...
         *
         * See also setDefaultTracks();
         * @param tracks
         */
        Viewer.prototype.setTracks = function (tracks) {
            this.asyncTracks = tracks;
        };

        /** Sets the tracks to be displayed to the default, that is used at the RCSB PDB site
         *
         */
        Viewer.prototype.setDefaultTracks = function () {

            // single PDB mode does not show externl annotations
            if (this.singlePDBmode) {
                this.asyncTracks = [{
                    'name': 'pdbsites',
                    'url': this.rcsbServer + '/pdb/protein/' + this.uniprotID +
                    '?type=json&track=pdbsites&display=' + this.displayPDB
                }, {
                    'name': 'SCOP',
                    'url': this.rcsbServer + '/pdb/protein/' + this.uniprotID +
                    '?type=json&track=scop&display=' + this.displayPDB
                }, {
                    'name': 'Validation',
                    'url': this.rcsbServer + '/pdb/protein/' + this.uniprotID +
                    '?type=json&track=validation&display=' + this.displayPDB
                }];
            } else {
                this.asyncTracks = [{
                    'name': 'Exons',
                    'url': this.rcsbServer + '/pdb/protein/' + this.uniprotID +
                    '?type=json&track=exons'
                }, {
                    'name': 'pfam',
                    'url': this.rcsbServer + '/pdb/protein/' + this.uniprotID +
                    '?type=json&track=pfam'
                }, {
                    'name': 'pmp',
                    'url': this.rcsbServer + '/pdb/protein/' + this.uniprotID +
                    '?type=json&track=pmp'
                }, {
                    'name': 'hydropathy',
                    'url': this.rcsbServer + '/pdb/protein/' + this.uniprotID +
                    '?type=json&track=hydropathy'
                }, {
                    'name': 'Disorder',
                    'url': this.rcsbServer + '/pdb/protein/' + this.uniprotID +
                    '?type=json&track=jronn'
                }, {
                    'name': 'SCOP',
                    'url': this.rcsbServer + '/pdb/protein/' + this.uniprotID +
                    '?type=json&track=scop'
                }, {
                    'name': 'pdbsites',
                    'url': this.rcsbServer + '/pdb/protein/' + this.uniprotID +
                    '?type=json&track=pdbsites'
                }, {
                    'name': 'phosporylation',
                    'url': this.rcsbServer + '/pdb/protein/' + this.uniprotID +
                    '?type=json&track=phosphorylation'
                }, {
                    'name': 'variation',
                    'url': this.rcsbServer + '/pdb/protein/' + this.uniprotID +
                    '?type=json&track=variation'
                }


                ];
            }

            if (!this.singlePDBmode && this.addedPDB.length > 0) {
                for (var a = 0; a < this.addedPDB.length; a++) {
                    this.asyncTracks.push({
                        'name': 'pdbsites',
                        'url': this.rcsbServer + '/pdb/protein/' + this.uniprotID +
                        '?type=json&track=pdbsites&display=' + this.addedPDB[a]
                    });
                    this.asyncTracks.push({
                        'name': 'Validation',
                        'url': this.rcsbServer + '/pdb/protein/' + this.uniprotID +
                        '?type=json&track=validation&display=' + this.addedPDB[a]
                    });
                    console.log("should take care of "+ this.addedPDB[a]);
                }

            }

        };


        Viewer.prototype.getData = function () {
            return this.data;
        };

        Viewer.prototype.setData = function (json) {

            this.data = json;

            // trigger async loads...
            if (typeof this.asyncTracks === 'undefined') {
                // we always updated the tracks based on the uniProt IDs
                this.setDefaultTracks();
            }

            if (!this._initialized) {
                this._initialized = true;
                this._dispatchEvent({
                        'name': 'viewerReadyEvent'
                    },
                    'viewerReady', this);
            } else {
                this._dispatchEvent({
                        'name': 'dataReloadedEvent'
                    },
                    'dataReloaded', this);
            }

            var successMethod = function (json) {
                that.parseJsonResponse(json);
            };
            var errorMethod = function (jqXHR, textStatus, exception) {

                console.log("ajax error: status code: " + jqXHR.status);

                if (jqXHR.status === 0) {
                    console.log('Not connected. \n Verify Network.');
                } else if (jqXHR.status === 404) {
                    console.log('Requested page not found. [404]');
                } else if (jqXHR.status === 500) {
                    console.log('Internal Server Error [500].');
                } else if (exception === 'parsererror') {
                    console.log('Requested JSON parse failed.');
                } else if (exception === 'timeout') {
                    console.log('Time out error.');
                } else if (exception === 'abort') {
                    console.log('Ajax request aborted.');
                } else {
                    console.log('Uncaught Error.\n' + jqXHR.responseText);
                }


                console.log('error during ajax request: ' + exception);
                console.log('textstatus: ' + textStatus);
                console.log(jqXHR.responseText);
            };

            for (var i = 0; i < this.asyncTracks.length; i++) {
                var track = this.asyncTracks[i];

                var url = track.url;

                //this.loadURLAsync(url);
                var that = this;

                console.log("requesting " + url);
                $.ajax({
                    url: url,
                    dataType: "json",
                    type: "GET",
                    cache: true,
                    context: that,
                    success: successMethod,
                    error: errorMethod,
                    async: true
                });

            }


        };

        Viewer.prototype.loadURLAsync = function (url) {
            var that = this;
            console.log("requesting " + url);


            if (window.Worker) {

                var myWorker = new Worker('js/pfv/JsonWorker.js');

                myWorker.onerror = function (e) {
                    console.log("error when loading data from URL: " + url);
                    console.log('Error: Line ' + e.lineno + ' in ' + e.filename + ': ' + e.message);

                    myWorker.postMessage({
                        'cmd': 'stop'
                    });

                };

                myWorker.onmessage = function (event) {

                    var json = JSON.parse(event.data);

                    that.parseJsonResponse(json.json);

                    myWorker.postMessage({
                        'cmd': 'stop'
                    });

                };

                myWorker.postMessage({
                    'cmd': 'load',
                    'msg': decodeURI(url)
                });

            } else {

                // older browsers...


                $.ajax({
                    url: url,
                    dataType: "json",
                    type: "GET",
                    cache: true,
                    context: that,
                    async: true,
                    success: function (json) {
                        that.parseJsonResponse(json);
                    },
                    error: function (jqXHR, textStatus, exception) {

                        console.log("ajax error: status code: " + jqXHR.status);

                        if (jqXHR.status === 0) {
                            console.log('Not connected. \n Verify Network.');
                        } else if (jqXHR.status === 404) {
                            console.log('Requested page not found. [404]');
                        } else if (jqXHR.status === 500) {
                            console.log('Internal Server Error [500].');
                        } else if (exception === 'parsererror') {
                            console.log('Requested JSON parse failed.');
                        } else if (exception === 'timeout') {
                            console.log('Time out error.');
                        } else if (exception === 'abort') {
                            console.log('Ajax request aborted.');
                        } else {
                            console.log('Uncaught Error.\n' + jqXHR.responseText);
                        }


                        console.log('error during ajax request: ' + exception);
                        console.log('textstatus: ' + textStatus);
                        console.log(jqXHR.responseText);
                    }
                });
            }

        };

        Viewer.prototype.parseJsonResponse = function (json) {
            //console.log("got json response..." + JSON.stringify(json));
            if (typeof json.pfam !== 'undefined') {
                this.data.pfam = json.pfam;
                // console.log("got pfam response");
            } else if (typeof json.pmp !== 'undefined') {
                this.data.pmp = json.pmp;
                // console.log("got PMP response");
            } else if (typeof json.pdbsites !== 'undefined') {
                this.data.pdbsites = json.pdbsites;
                // console.log("got PDB sites response for " + json.pdbID);
            } else if (typeof json.phosphorylation !== 'undefined') {
                this.data.phospho = json.phosphorylation;
                // console.log("got phosphosite response");
            } else if (typeof json.hydropathy !== 'undefined') {
                // console.log("got hydropathy response");
                this.data.hydropathy_max = json.hydropathy.hydropathy_max;
                this.data.hydropathy_min = json.hydropathy.hydropathy_min;
                this.data.hydropathy = json.hydropathy;
            } else if (typeof json.jronn !== 'undefined') {
                this.data.jronn_max = json.jronn.jronn_max;
                this.data.jronn_min = json.jronn.jronn_min;
                this.data.jronn = json.jronn;
                // console.log("got jronn response");
            } else if ((typeof json.scop !== 'undefined') || (typeof json.scope !== 'undefined')) {
                if (typeof json.scop !== 'undefined') {
                    this.data.scop = json.scop;
                    // console.log("got scop response");
                }
                if (typeof json.scope !== 'undefined') {
                    this.data.scope = json.scope;
                    // console.log("got scope response");
                }
            } else if (typeof json.exon !== 'undefined') {
                this.data.exon = json.exon;
                // console.log("got EXON response: ");
            } else if (typeof json.validation !== 'undefined') {
                this.data.validation = json.validation;
                // console.log("got validation response");
            } else if (typeof json.variation !== 'undefined') {
                this.data.variation = json.variation;
                // console.log("got variation response");
            }
            this.repaint();
        };

        Viewer.prototype.getUniprotID = function () {
            return this.data.uniprotID;
        };

        /** Sets a flag which PDB and chain Id are shown in the associated 3D viewer.
         * PFV then draws an icon at the left side of the track,
         * indicating that it is highlighted in 3D.
         */
        Viewer.prototype.set3dViewFlag = function (pdbId, chainId) {

            this.pdbIn3d = pdbId.toUpperCase();

            // chain IDs are case sensitive
            this.chainIn3d = chainId;

            this.repaint();
        };

        /** Switch to the display of a single PDB ID
         *
         * @param pdbId
         */
        Viewer.prototype.showPDB = function (pdbId) {

            if (typeof pdbId !== 'undefined') {

                if (pdbId.length > 3) {

                    this.singlePDBmode = true;

                    this.displayPDB = pdbId.toUpperCase();

                    this.showCondensed = false;
                } else if (pdbId.length === 0) {
                    // pdbId is set to ''
                    this.singlePDBmode = false;
                    this.displayPDB = '';

                    this.showCondensed = true;
                }

                //  this.setDefaultTracks();
            }

        };

        /** Add a single PDB ID to the 'full'- display. Does not switch the viewr to singlePDBmode
         *
         * @param pdbId
         */
        Viewer.prototype.addPDB = function (pdbId) {

            if (typeof pdbId !== 'undefined') {

                if (pdbId.length > 3) {

                    //this.singlePDBmode = true;

                    //this.displayPDB = pdbId;

                    this.addedPDB.push(pdbId);
                    this.showCondensed = true;
                }

            }

        };


        /** Add a single PDB ID to the 'full'- display. Does not switch the viewr to singlePDBmode
         *
         * @param pdbId
         */
        Viewer.prototype.trackShouldBeDisplayed = function (track) {

            if (!this.showCondensed) {
                return true;
            }


            if (typeof track.bestInCluster !== 'undefined' && track.bestInCluster) {
                return true;
            }

            var pdbID = track.pdbID.toUpperCase();

            if (pdbID === this.displayPDB) {
                return true;
            }

            return this.isAddedPDB(pdbID);


        };


        /** check if a PDB ID is contained in the list of "added" PDB IDs.
         */
        Viewer.prototype.isAddedPDB = function (pdbID) {

            for (var a = 0; a < this.addedPDB.length; a++) {

                if (this.addedPDB[a].toUpperCase() === pdbID) {
                    return true;
                }
            }

            return false;
        };


        /** Toggle the display of all PDB ids or the restriction to only one
         *
         * @param flag
         */
        Viewer.prototype.showAll = function (flag) {

            this.singlePDBmode = flag;


        };


        Viewer.prototype.setDialogDiv = function (dialogD) {

            this.dialogDiv = dialogD;

        };
        Viewer.prototype.setScrollBarDiv = function (scrollBarD) {

            this.scrollBarDiv = scrollBarD;

            $(this.scrollBarDiv).on('slide', $.proxy(this, 'scrollValueChanged'));
            $(this.scrollBarDiv).on('mouseup', $.proxy(this, 'scrollReleased'));
        };

        Viewer.prototype.getScrollBarValue = function () {
            return $(this.scrollBarDiv).slider().slider('getValue');
        };

        Viewer.prototype.setParentDiv = function (parentDiv) {
            // console.log("new Parent DIV: " + parentDiv);
            this.outerParent = parentDiv;
            this.contentDiv = parentDiv;

            var myInnerDiv = $("<div>");
            $(this.outerParent).append(myInnerDiv);
            this.parent = myInnerDiv;
        };


        Viewer.prototype.getParent = function () {
            return this.parent;
        };

        Viewer.prototype.getSVGWrapper = function () {

            //return parent.svg('get');
            return $(this.parent).svg('get');

        };
        Viewer.prototype.reloadData = function () {

            var pal = "";

            if (typeof this.data.paletteName !== 'undefined') {
                pal = "&palette=" + this.data.paletteName;
            }

            var url = "/pdb/protein/" + this.uniprotID + "?type=json" + pal;

            $.getJSON(url, function (json) {
                this.data = json;
                this.repaint();
            });


        };

        Viewer.prototype.reset = function () {

            $("#uniprotsubheader").html("");

            this.svg = this.getSVGWrapper();

            if (typeof svg === 'undefined') {
                return;
            }

            this.svg.clear();
            this.data = {};
            this.hideColorLegend();

        };

        Viewer.prototype.repaint = function () {

            if (typeof this.parent === 'undefined') {
                console.error("can't repaint, no parent");
                return;
            }

            $("#uniprotsubheader").html("");

            var svg = this.getSVGWrapper();

            if (typeof svg === 'undefined') {
                console.warn("can't repaint, no svg");
                return;
            }

            try {

                svg.clear();

                this.drawInitial(svg);

                this.drawer.maxY = this.y + this.params.bottomBorder;

                // prevent hanging tooltips on resize
                $('.tooltip').tooltip('hide');

            } catch (err) {
                console.error(err);
            }
        };


        Viewer.prototype.doModal = function (placementId, heading, formContent, strSubmitFunc, btnText) {
            //return;
            //jQuery.noConflict();
            //check if its a show 3d ?
            var html = '<div id="modalWindow" class="modal fade " tabindex="-1" role="dialog" ' +
                ' aria-hidden="true">';
            var html = '<div class="modal-dialog">';
            html += '<div class="modal-content">';
            html += '<div class="modal-header">';
            html += '<a class="close" data-dismiss="modal">&times;</a>';
            html += '<h4>' + heading + '</h4>';
            html += '</div>';
            html += '<div class="modal-body">';
            html += '<p>';
            html += formContent;
            html += '</div>';
            html += '<div class="modal-footer">';
            if (btnText !== '') {
                html += '<button class="btn btn-success"  data-dismiss="modal"';
                html += ' onClick="' + strSubmitFunc + '; event.preventDefault();">' + btnText;
                html += '</button>';
            }
            html += '<button id="dialogClose" class="btn" data-dismiss="modal">Close';
            html += '</button>'; // close button
            html += '</div>'; // footer
            html += '</div></div>'; //content, dialog
            html += '</div>'; // modalWindow
            //('#dialog').html(html);
            var dialog = document.getElementById("dialog");
            dialog.innerHTML = html;
            //(placementId).html(html);//this is not  a function
            dialog.style.display = "block";
            //just do the callback if showin3d?
            //('#modalWindow').modal();
            //('#modalWindow').show();
            console.log(formContent);
            console.log(strSubmitFunc);
            var btn = document.getElementById("dialogClose");
            var span = document.getElementsByClassName("close")[0];
            // When the user clicks on <span> (x), close the modal
						span.onclick = function() {
						    dialog.style.display = "none";
						}
						btn.onclick = function() {
						    dialog.style.display = "none";
						}						
            window.onclick = function(event) {
						    if (event.target == dialog) {
						        dialog.style.display = "none";
						    }
						} 
        };

        Viewer.prototype.hideModal = function () {
            // Using a very general selector - this is because $('#modalDiv').hide
            // will remove the modal window but not the mask
            $('.modal.in').modal('hide');
        };


        Viewer.prototype.load3DChain = function (pdbID, chainID) {

            console.log("loading " + pdbID + " chain ID: " + chainID);
            window.location = this.rcsbServer + "/pdb/explore/explore.do?structureId=" + pdbID;
            return;

        };

        /** Returns matching PDB positions for a UniProt sequence position.
         * if no matching positions, returns and empty array.
         */
        Viewer.prototype.getPdbPositions = function (seqStart, seqEnd) {
            // loop over all tracks

            console.log("mapping uniprot:" + seqStart + " " + seqEnd + " to PDB");


            if (typeof seqEnd === 'undefined') {
                seqEnd = seqStart;
            }

            var pdbPositions = [];

            for (var i = 0; i < this.data.tracks.length; i++) {

                var track = this.data.tracks[i];

                if (typeof track === 'undefined') {
                    continue;
                }
                // we only deal with the representatives..
                if (typeof track.bestInCluster !== 'undefined' && track.bestInCluster) {

                    // determine the overlap with that sequence position...
                    for (var r = 0; r < track.ranges.length; r++) {

                        var rangeOrig = track.ranges[r];

                        var range = {};

                        range.start = rangeOrig.start - 1;
                        range.end = rangeOrig.end - 1;
                        range.observed = rangeOrig.observed;
                        range.mismatch = rangeOrig.mismatch;

                        var tmpEnd = seqEnd;
                        if (seqStart === seqEnd) {
                            tmpEnd++;
                        }

                        var overlap = (this.drawer.getOverlap(seqStart, tmpEnd, range.start, range.end));

                        if (overlap > 0) {
                            // we found an overlap!
                            if (typeof rangeOrig.pdbStart !== 'undefined') {

                                var leftTerm = Math.max(range.start, seqStart);
                                var rightTerm = Math.min(range.end, seqEnd);

                                // get the offset to the beginning..
                                var offsetLeft = 0;
                                var offsetRight = 0;
                                if (seqStart > range.start) {
                                    offsetLeft = seqStart - range.start;
                                }
                                if (seqEnd < range.end) {
                                    offsetRight = range.end - seqEnd;
                                }
                                var pos = {};

                                pos.seqPos = leftTerm;
                                pos.seqEnd = rightTerm;
                                pos.pdbStart = parseInt(rangeOrig.pdbStart) + offsetLeft;
                                pos.pdbEnd = parseInt(rangeOrig.pdbEnd) - offsetRight;
                                pos.pdbId = track.pdbID;
                                pos.chainId = track.chainID;

                                pdbPositions.push(pos);
                            }
                        }
                    }
                }

            }

            console.log(pdbPositions);
            return pdbPositions;
        };

        Viewer.prototype.registerPdb3dLinks = function (pdbPositions, name) {

            // now bind the callback to the anchor tags in the modal dialog
            for (var p = 0; p < pdbPositions.length; p++) {

                var pdbPos2 = pdbPositions[p];

                var showIn3dId2 = "showIn3d" + pdbPos2.pdbId;

                console.log("register 3D links " + showIn3dId2);

                if (typeof pdbPos2.chainId !== 'undefined') {
                    showIn3dId2 += pdbPos2.chainId;
                }

                if (typeof pdbPos2.pdbStart !== 'undefined') {
                    showIn3dId2 += pdbPos2.pdbStart;
                }

                if (typeof name !== 'undefined') {
                    showIn3dId2 += name;
                }

                if (typeof NGL === 'undefined') {
                    // get href of anchor tag
                    var url = $("#" + showIn3dId2).attr("href");
                    pdbPos2.url = url;
                }


                $("#" + showIn3dId2).bind('click', $.proxy(this.show3dCallback, this, pdbPos2));

            }
        };

        Viewer.prototype.show3dCallback = function (ppos) {

            console.log("show3dCallback " + JSON.stringify(ppos));

            this._dispatchEvent({
                    "name": "showPositionIn3d"
                },
                "showPositionIn3d", ppos);

            if (typeof NGL === 'undefined') {
                // get href of anchor tag
                var url = ppos.url;

                window.location = url;
            }


            if (typeof ppos.seqPos !== 'undefined' && typeof ppos.seqEnd !== 'undefined') {
                this.highlight(ppos.seqPos, ppos.seqEnd);
            } else {
                this.highlight(-1, -1);
            }
        };

        Viewer.prototype.showPdb3dLinks = function (pdbPositions, name) {


            if (pdbPositions.length <= 0) {
                return "";
            }

            var nglPresent = true;
            if (typeof NGL === 'undefined') {
                nglPresent = false;
            }

            var html = "<h3>Show in 3D on PDB structure</h3>";

            for (var i = 0; i < pdbPositions.length; i++) {

                var pdbPos = pdbPositions[i];

                console.log(pdbPos);

                var showIn3dId = "showIn3d" + pdbPos.pdbId;

                if (typeof pdbPos.chainId !== 'undefined') {
                    showIn3dId += pdbPos.chainId;
                }

                if (typeof pdbPos.pdbStart !== 'undefined') {
                    showIn3dId += pdbPos.pdbStart;
                }

                if (typeof name !== 'undefined') {
                    showIn3dId += name;
                }

                html += "<ul><li>Show in 3D on PDB <a href=";


                if (nglPresent) {
                    html += "'#'";
                } else {
                    html += "'" + this.rcsbServer + "/pdb/protein/" + this.data.uniprotID +
                        "?addPDB=" + pdbPos.pdbId +
                        "&selectionStart=" + pdbPos.seqPos;

                    if (typeof pdbPos.seqEnd !== 'undefined') {
                        html += "&selectionEnd=" + pdbPos.seqEnd;
                    }
                    html += "'";
                }


                //

                html += " id='" + showIn3dId + "' data-dismiss='modal'>" +
                    pdbPos.pdbId;

                if (typeof pdbPos.chainId !== 'undefined') {
                    html += "." + pdbPos.chainId;
                }

                if (typeof pdbPos.pdbStart !== 'undefined') {
                    html += "(" + pdbPos.pdbStart;
                }

                if (typeof pdbPos.pdbEnd !== 'undefined' && (pdbPos.pdbStart !== pdbPos.pdbEnd)) {
                    html += "-" + pdbPos.pdbEnd;
                }

                if (typeof pdbPos.pdbStart !== 'undefined') {
                    html += ")";
                }

                html += "</a></ul></li>";


            }
            return html;
        };


        /** Set the zoom level. Can be either "View whole" or "Maximum zoom"
         *
         * @param zoom
         */
        Viewer.prototype.setZoomLevel = function (zoom) {


            //console.log($('#sequencezoom').val() + " ?? " + zoom);

            if (zoom.indexOf("whole") !== -1) {

                this.updateScale();

            } else {
                //$(this.scrollBarDiv).slider().slider('setValue', 100);

                this.setScale(this.params.maxTextSize);
            }

            this.repaint();

        };


        Viewer.prototype.getPreferredWidth = function () {

            var availWidth = $(this.contentDiv).width() - this.params.leftBorder - this.params.rightBorder;

            var visibleWidth = $(window).width() -
                this.params.leftBorder - this.params.rightBorder;

            if (availWidth > visibleWidth) {
                availWidth = visibleWidth;
            }


            if (availWidth < 1) {
                console.log('something is wrong with the page setup. the contentDiv ' +
                    this.contentDiv + ' has size ' + $(this.contentDiv).width());

            }


            return availWidth;

        };

        Viewer.prototype.getMinScale = function () {

            var availWidth = this.getPreferredWidth();

            //$(window).width() - $('#leftMenu').width() - leftBorder -  rightBorder;
            return availWidth / (this.sequence.length);

        };

        /** Update the scale to the default scale - currently to
         * show the whole sequence in the available space

         * returns true if the display should be updated.
         *
         */
        Viewer.prototype.updateScale = function () {

            var newScale = 1;

            if (typeof this.sequence !== "undefined") {
                var availWidth = this.getPreferredWidth();

                // console.log("availWidth: " + availWidth);
                // console.log("sequence length: " + this.sequence.length);
                // console.log($(this)[0].parent.length);

                newScale = (availWidth) / (this.sequence.length);

                if (typeof $(this.scrollBarDiv).slider() !== 'undefined') {

                    //$(this.scrollBarDiv).slider().slider('setValue', 0);
                }

                // TODO: WIDTH - should fit into the 'td'
                $(this.parent).css('overflow', 'auto');
                // $(this.parent).css('width', availWidth);

            } else {
                console.error("sequence is not defined!");

                this.sequence = {};
                this.sequence.length = this.data.length;
                this.sequence.name = this.data.uniprotID;

            }
            // console.log("update scale  " + newScale);

            if (this.oldScale < 0) {
                this.drawer.setScale(newScale);

                return true;
            }

            if (this.oldScale === newScale) {
                return false;
            }

            this.drawer.setScale(newScale);

            return true;


        };

        /** Set the scale of the current display. The value is the amount of
         * space given for rendering one amino acid.
         *
         * @param aaWidth - width of one amino acid
         */
        Viewer.prototype.setScale = function (aaWidth) {

            if (aaWidth > this.params.maxTextSize) {
                aaWidth = this.params.maxTextSize;
            }

            this.drawer.setScale(aaWidth);

            this.oldScale = aaWidth;

        };


        /** Reset the size of the SVG object
         *
         * @param svg
         * @param width
         * @param height
         */
        Viewer.prototype.resetSize = function (svg, width, height) {

            svg.configure({
                width: width || $(svg._container).width(),
                height: height || $(svg._container).height()
            });


        };


        /** Do the actual drawing
         *
         */
        Viewer.prototype.drawInitial = function (svg) {

            if (typeof this.data.uniprotID === 'undefined') {
                alert('Did not find a UniProt ID! ' + JSON.stringify(this.data));
                return;
            }

            var data = this.data;

            var y = this.y;

            this.sequence = {};
            this.sequence.length = data.length;
            this.sequence.name = data.uniprotID;

            var desc = data.desc;

            var header = "<h1>Protein Feature View - " + data.uniprotID;

            if (typeof(data.name !== 'undefined')) {
                header += ' (' + data.name + ')';
            }

            if (typeof desc !== 'undefined') {
                header += " - " + desc;
            }

            header += "</h1>";

            this.filterTracks();

            var html = data.uniprotID + " <span class='iconSet-main icon-external' " +
                " title='Link to UniProtKB entry. Up-to-date UniProt Ids are provided by the " +
                " SIFTS project (http://www.ebi.ac.uk/pdbe/docs/sifts)'> &nbsp;</span>";


            $('#linktouniprot').attr("href", "http://www.uniprot.org/uniprot/" + data.uniprotID)
                .attr("title", "link to uniprot web site " + data.uniprotID).html(html);

            var href = this.rcsbServer +
                "/pdb/search/smart.do?smartComparator=and&smartSearchSubtype_0=" +
                "UpAccessionIdQuery&target=Current&accessionIdList_0=" + data.uniprotID;

            $('#searchinpdb').attr("href", href)
                .attr("title", "Find all matching PDB IDs for" + data.uniprotID)
                .html("Search PDB");


            $('#uniprotLength > span').html(data.length);
            $('#chainSummaryImage').hide();
            $('#uniprotSpecies > span').html(data.species);


            // now done in constructor
            //var drawer = new draw.Draw(this);
            //this.drawer = drawer;
            var drawer = this.drawer;

            if (typeof this.drawer !== 'undefined') {
                drawer.scale = this.drawer.scale;
            }

            this.params = drawer.getParams();


            if (drawer.scale < 0) {
                this.updateScale();
            }


            y = drawer.height;

            drawer.drawSelection(svg, this.previousY);

            if (!this.singlePDBmode) {
                y = drawer.drawRuler(svg, this.sequence, y);
            }

            var uniprotTopY = y;

            y = drawer.drawSequence(svg, this.sequence, y);

            y = drawer.drawUniprotFeatures(svg, y);

            y = drawer.drawUPSites(svg, y);

            y = drawer.drawVariation(svg, y);

            var uniprotBottomY = y;

            if (!this.singlePDBmode) {

                // 70 is the minimum space to render "uniprotkb"

                if (uniprotBottomY - uniprotTopY < 70) {
                    y = (y - uniprotTopY) + 70;
                    uniprotBottomY = y;

                }
            }

            drawer.drawSourceIndication(svg, 'UniProtKB', uniprotTopY, uniprotBottomY);


            if (!this.singlePDBmode) {

                var pfamTopY = y;

                y = drawer.drawPfam(svg, y);

                var pfamY = y;

                drawer.drawSourceIndication(svg, 'Pfam', pfamTopY, pfamY);
            }


            var phosphoTop = y;

            y = drawer.drawPhosphoSites(svg, y);

            drawer.drawSourceIndication(svg, "Phospho", phosphoTop, y);

            var domainTop = y;

            y = drawer.drawSCOP(svg, this.sequence, y);

            drawer.drawSourceIndication(svg, 'Domains', domainTop, y);


            var algoTop = y;


            y = drawer.drawJronn(svg, this.sequence, y);

            y = drawer.drawHydropathy(svg, this.sequence, y);

            y = drawer.drawSignalP(svg, this.sequence, y);

            drawer.drawSourceIndication(svg, 'Calculated', algoTop, y);


            var exoTop = y;

            y = drawer.drawExons(svg, this.sequence, y);

            drawer.drawSourceIndication(svg, 'Exon', exoTop, y);

            var pdbTopY = y;

            y = drawer.drawPDBSites(svg, y);

            y = drawer.drawPDBSecstruc(svg, y);

            y = drawer.drawPDBValidation(svg, this.sequence, y);

            if ((!this.showCondensed) && (!this.singlePDBmode)) {
                // add a spacer ;
                y += this.params.trackHeight;
                drawer.drawSourceIndication(svg, 'PDB', pdbTopY, y);
                y = drawer.drawCollapseCondensedSymbol(svg, y);
                pdbTopY = y;
            }


            this.sortTracks(this.defaultSort);

            var counter = 0;
            var colorPos = -1;

            var checkedTracks = [];
            for (var j = 0; j < data.tracks.length; j++) {
                var track1 = data.tracks[j];
                if (track1 === null) {
                    continue;
                }
                checkedTracks.push(track1);
            }

            data.tracks = checkedTracks;

            //console.log("single pdb mode : " + this.singlePDBmode + ' ' + this.displayPDB);

            for (var i = 0; i < data.tracks.length; i++) {
                var track = data.tracks[i];

                var pdbIdUpper = track.pdbID.toUpperCase();
                if (this.isAddedPDB(pdbIdUpper)) {
                    drawer.highlightTrack(svg, track, y, i);
                }

                // console.log(this.pdbIn3d + " " + this.chainIn3d + " " + pdbIdUpper + " " +track.chainID);

                if (this.pdbIn3d === pdbIdUpper && this.chainIn3d === track.chainID) {
                    drawer.draw3dFlagForTrack(svg, track, y, i);
                }


                if (this.singlePDBmode) {

                    if (track.pdbID !== this.displayPDB) {
                        continue;
                    }
                    if (counter > this.params.maxTracksSingleMode) {
                        continue;
                    }
                } else if (this.showCondensed) {

                    var shouldBeDisplayed = this.trackShouldBeDisplayed(track);

                    if (!shouldBeDisplayed) {
                        continue;
                    }
                }
                counter++;

                colorPos++;


                if (colorPos >= this.params.customColors.length) {
                    colorPos = 0;
                }

                var colorData = drawer.getTrackColor(this.params.customColors, colorPos, track);

                track.color = colorData.color;
                track.lightercolor = colorData.lightercolor;

                y = drawer.drawTrack(svg, track, y, i);
            }

            var pdbBottomY = y;

            drawer.drawSourceIndication(svg, 'PDB', pdbTopY, pdbBottomY);

            var title = "Showing a representative subset of PDB matches. Click for more ";

            var that = this;
            var callback = function () {
                if (typeof pageTracker !== 'undefined') {
                    pageTracker._trackEvent('ProteinFeatureView', 'showCondensedView', 'true');
                }
                that.setShowCondensed(false);
                $('#showCondensed').text("Show Condensed View");
            };

            var totalTracks = this.getTotalNrPDBTracks();

            if (this.showCondensed && !(this.singlePDBmode) && (totalTracks > 1)) {
                y = drawer.drawExpandCondensedSymbol(svg, pdbBottomY, title, callback);
            }


            if (!this.singlePDBmode) {

                y = this.drawMultiPdbTracks(svg, y, colorPos);

            } else {

                var title1 = "Click here to view more details about " + data.uniprotID;

                var callback1 = function () {
                    var location = that.rcsbServer + "/pdb/protein/" + data.uniprotID;

                    if (that.displayPDB !== '') {
                        location += "?addPDB=" + that.displayPDB;
                    }
                    window.location = location;
                };
                y = drawer.drawExpandCondensedSymbol(svg, pdbBottomY, title1, callback1);
            }


            var w = (data.length) * drawer.scale + this.params.leftBorder + this.params.rightBorder;

            // if ( w > $(svg._container).width() ) {
            //     w = $(svg._container).width();
            // }

            this.resetSize(svg, w, y + this.params.bottomBorder);


            // this.resetSize(svg, (data.length) * drawer.scale + this.params.leftBorder +
            //     this.params.rightBorder, y + this.params.bottomBorder);

            var fullTrackCount = this.getTotalNrPDBTracks();

            if (counter > 0) {
                if (counter < fullTrackCount) {

                    $("#clusterStats").html("Showing " + counter + " representative out of " +
                        fullTrackCount + " PDB chains");
                } else {
                    $("#clusterStats").html("Showing all " + counter + " PDB chains");
                }
            } else {

                $("#clusterStats").html("Showing all PDB entries");
            }

            this.y = y;

            this.previousY = y;


            //var timet = new Date().getTime();

            $('[data-toggle="tooltip"]').tooltip();


            //console.log('init - tooltip ' + (timet-now));

            //var end = new Date().getTime();


            //console.log("time to repaint SVG graphics: " + (end-now));

        };

        Viewer.prototype.drawMultiPdbTracks = function (svg, y, colorPos) {

            //if ( data.externalTracks.names.length > 0)
            //  y = drawSeparator(svg,y);

            var data = this.data;
            var drawer = this.drawer;

            var pmpTopY = y;

            if (typeof data.pmp !== 'undefined') {

                // add a spacer..
                y += this.params.trackHeight;

                var trackName = data.pmp.label;

                trackName = trackName.replace(' ', '_');

                colorPos++;

                if (colorPos >= colors.length) {
                    colorPos = 0;
                }
                var trackdata = data.pmp;


                //var trackrows = breakTrackInRows(trackdata.tracks);
                var trackrows = drawer.breakTrackInRows(data.pmp.tracks);

                var url = "http://www.proteinmodelportal.org/query/up/" + data.uniprotID;

                var callbackexternal = function () {
                };
                var that = this;
                if (trackdata.label === "Homology Models from Protein Model Portal") {
                    callbackexternal = function () {
                        if (typeof pageTracker !== 'undefined') {
                            pageTracker._trackEvent('ProteinFeatureView',
                                'showPMPDialog', data.uniprotID);
                        }

                        var html = "<h3>" + this.desc + "</h3>";

                        html += "<li>View all <a href='" + url +
                            "' target='_new'>Homology Models at the Protein Model Portal</a></li>";
                        html += "</ul>";

                        var heading = "Protein Model Portal";

                        var strSubmitFunc = "";
                        var btnText = "";

                        //that.doModal(that.dialogDiv, heading, html, strSubmitFunc, btnText);
                    };
                }


                if (trackrows.length > 0) {

                    if (trackdata.label === "Homology Models from Protein Model Portal") {

                        y = drawer.drawRangedTrack(svg, trackrows, y,
                            "Homology Models", "Homology_Models",
                            this.params.homColors, undefined, callbackexternal, trackdata.label);
                    } else {
                        y = drawer.drawGenericTrack(svg, trackrows, y, trackName, trackrows[0].desc,
                            this.params.homColors, url, undefined, trackdata.label);
                    }
                }
            }


            // spacer
            y += this.params.trackHeight;

            var pmpBottomY = y;
            if (pmpBottomY - pmpTopY < 40) {
                y = pmpTopY + 40;
                pmpBottomY = y;
            }
            drawer.drawSourceIndication(svg, 'Structural Biology Knowledge Base', pmpTopY, pmpBottomY);

            return y;

        };

        /** Returns the total number of PDB entries that match to this UniProt.
         *
         */
        Viewer.prototype.getTotalNrPDBTracks = function () {


            var fullTrackCount = this.data.tracks.length;
            if (typeof this.data.backupTracks !== 'undefined') {

                fullTrackCount = this.data.backupTracks.length;
            }
            return fullTrackCount;

        };


        Viewer.prototype.hideColorLegend = function () {
            $("#colorLegend").html("");
        };

        Viewer.prototype.changeColorSelect = function (str) {

            this.colorBy = str;

            if (str === "Resolution") {
                this.hideColorLegend();
                //this.paired_colors = data.colors;

                this.drawer.updateTrackColors(this.params.redblue_colors);
                this.repaint();
                this.showColorLegend();

            } else {

                this.hideColorLegend();

                this.drawer.updateTrackColors(this.params.paired_colors);
                this.repaint();

            }

        };

        Viewer.prototype.setShowCondensed = function (flag) {


            var totalTracks = this.getTotalNrPDBTracks();
            if (totalTracks < 2) {
                return;
            }

            this.showCondensed = flag;

            this.filterTracks();

            this.repaint();

        };

        /** condense the tracks for sequences that have a large number of mappings like thrombin
         *
         */
        Viewer.prototype.filterTracks = function () {


            var data = this.data;
            if (this.showCondensed) {

                if (typeof data.backupTracks === 'undefined') {
                    data.backupTracks = data.tracks;
                }

                if (data.tracks.length < data.backupTracks.length) {
                    return;
                    // already did filtering before...
                }

                var newTracks = [];

                for (var i = 0; i < data.backupTracks.length; i++) {
                    var track = data.backupTracks[i];
                    if (typeof track === 'undefined' || track === null) {
                        continue;
                    }
                    if (this.trackShouldBeDisplayed(track)) {
                        newTracks.push(track);
                    }
                }

                data.tracks = newTracks;

            } else {
                if (typeof data.backupTracks !== 'undefined') {
                    data.tracks = data.backupTracks;

                }
            }

            //checkUpdateSites4FirstTrack();


        };


        Viewer.prototype.getShowCondensed = function () {

            return this.showCondensed;

        };
        Viewer.prototype.showColorLegend = function () {

            var data = this.data;

            if (typeof data.colors === 'undefined') {
                return;
            }

            for (var i = 0; i < data.colors.length - 1; i++) {

                var color1 = data.colors[i];

                var colorBox1 = $("<div>").html("&nbsp;");
                $(colorBox1).attr("class", "leftBox headerExt alignmentBox11");
                $(colorBox1).css("background-color", color1.color);


                var colorMain1 = $("<div>").html(" Resolution < " + (i + 1) + " &Aring;");
                $(colorMain1).append(colorBox1);

                $("#colorLegend").append(colorMain1);
                $("#colorLegend").append("<br/>");

            }

            // the last color
            var color = data.colors[data.colors.length - 1];
            var colorBox = $("<div>").html("&nbsp;");
            $(colorBox).attr("class", "leftBox headerExt alignmentBox11");
            $(colorBox).css("background-color", color.color);


            var colorMain = $("<div>").html(" Resolution >= " + i + " &Aring;");
            $(colorMain).append(colorBox);
            $("#colorLegend").append(colorMain);
            $("#colorLegend").append("<br/>");

            // and the undefined...

            var colorBox2 = $("<div>").html("&nbsp;");
            $(colorBox2).attr("class", "leftBox headerExt alignmentBox11");
            $(colorBox2).css("background-color", this.bw_colors[6].color);


            var colorMain2 = $("<div>").html(" no Resolution ");
            $(colorMain2).append(colorBox2);

            $("#colorLegend").append(colorMain2);
            $("#colorLegend").append("<br/>");

        };


        Viewer.prototype.getSequence = function () {
            return this.data.sequence;
        };


        Viewer.prototype.sortTracks = function (text) {


            if (typeof this.data.tracks === 'undefined') {
                return;
            }


            if (text === 'Resolution') {
                try {
                    this.data.tracks = $(this.data.tracks).sort(sortResolution);
                } catch (err) {
                    console.log("ERROR DURING SORTING " + err);

                }

            } else if (text === 'Release Date') {
                this.data.tracks = $(this.data.tracks).sort(sortReleaseDate);
            } else if (text === 'Length') {
                this.data.tracks = $(this.data.tracks).sort(this.sortLength);
            } else if (text === 'Alignment Length') {
                this.data.tracks = $(this.data.tracks).sort(this.sortAlignLength);
            } else {
                this.data.tracks = $(this.data.tracks).sort(sortAlphabet);
            }

            this.defaultSort = text;

        };


        $.fn.extend({
            sort: function () {
                return this.pushStack([].sort.apply(this, arguments), []);
            }
        });


        function sortAlphabet(a, b) {
            if (a.pdbID === b.pdbID) {
                if (a.chainID === b.chainID) {
                    return 0;
                } else {
                    return a.chainID > b.chainID ? 1 : -1;
                }
            }
            return a.pdbID > b.pdbID ? 1 : -1;
        }

        function sortResolution(a, b) {
            if (a === 0 || b === null) {
                return 0;
            }

            if ((typeof a === 'undefined') ||
                (typeof b === 'undefined')
            ) {
                return 0;
            }
            if (
                (typeof a.resolution === 'undefined') &&
                (typeof b.resolution === 'undefined')
            ) {
                return 0;
            }
            if ((typeof a.resolution === 'undefined') &&
                (typeof b.resolution !== 'undefined')
            ) {
                return 1;
            }
            if ((typeof a.resolution !== 'undefined') &&
                (typeof b.resolution === 'undefined')
            ) {
                return -1;
            }

            if (a.resolution === b.resolution) {
                return 0;
            }

            return a.resolution > b.resolution ? 1 : -1;
        }

        function sortReleaseDate(a, b) {
            if (a.releaseDate === b.releaseDate) {
                return 0;
            }
            return a.releaseDate > b.releaseDate ? 1 : -1;

        }

        Viewer.prototype.sortLength = function (a, b) {
            if (a.length === b.length) {
                return 0;
            }
            return a.length > b.length ? -1 : 1;

        };
        Viewer.prototype.sortAlignLength = function (a, b) {
            if (a === null || b === null) {
                return 0;
            }

            if (typeof a.alignLength === 'undefined' ||
                typeof b.alignLength === 'undefined') {
                return 0;
            }

            if (a.alignLength === null || b.alignLength === null) {
                return 0;
            }


            if (a.alignLength === b.alignLength) {
                return 0;
            }
            return a.alignLength > b.alignLength ? -1 : 1;

        };


        Viewer.prototype.setPaletteName = function (name) {

            this.data.paletteName = name;
            this.reloadData();

        };

        Viewer.prototype.updatePalette = function () {

            $.each(this.data.palettes, function (key, value) {
                $('#paletteselect')
                    .append($("<option></option>")
                        .attr("value", value)
                        .text(value)
                    );
            });


        };

        Viewer.prototype.setShowSeqres = function (showS) {

            this.showSeqres = showS;

            if (this._initialized) {
                this.repaint();
            }

        };
        Viewer.prototype.getShowSeqres = function () {

            return this.showSeqres;


        };

        /** seqposEnd is optional */
        Viewer.prototype.highlight = function (seqposStart, seqposEnd) {

            if (typeof seqposEnd === 'undefined') {
                seqposEnd = seqposStart;
            }

            console.log('highlighting seq pos' + seqposStart + "-" + seqposEnd);

            if (seqposStart === this.selectionStart && this.seqposEnd === this.selectionEnd) {
                // nothing to be done here.
                return;
            }

            this.selectionStart = seqposStart;
            this.selectionEnd = seqposEnd;

            this.repaint();

            this._dispatchEvent({
                    'name': 'selectionChangedEvent'
                },
                'selectionChanged', this);

        };

        Viewer.prototype.updateURL = function (currUrl, param, paramVal) {
            var url = currUrl;
            var newAdditionalURL = "";
            var tempArray = url.split("?");
            var baseURL = tempArray[0];
            var aditionalURL = tempArray[1];
            var temp = "";
            if (aditionalURL) {
                var splitArray = aditionalURL.split("&");
                for (var i = 0; i < splitArray.length; i++) {
                    if (splitArray[i].split('=')[0] !== param) {
                        newAdditionalURL += temp + splitArray[i];
                        temp = "&";
                    }
                }
            }
            var rows_txt = temp + "" + param + "=" + paramVal;
            var finalURL = baseURL + "?" + newAdditionalURL + rows_txt;
            return finalURL;
        };

        Viewer.prototype._dispatchEvent = function (event, newEventName, arg) {

            var callbacks = this.listenerMap[newEventName];
            if (callbacks) {
                callbacks.forEach(function (callback) {
                    callback(arg, event);
                });
            }
        };

        Viewer.prototype.addListener = function (eventName, callback) {
            var callbacks = this.listenerMap[eventName];
            if (typeof callbacks === 'undefined') {
                callbacks = [];
                this.listenerMap[eventName] = callbacks;
            }

            callbacks.push(callback);


            if (this._initialized && eventName === 'viewerReady') {
                // don't use dispatch here, we only want this callback to be
                // invoked.
                callback(this, null);
            }
        };


        /** allows to talk to a different server location than default. Default is
         * localhost ( this.rcsbServer  = "");
         */

        Viewer.prototype.setRcsbServer = function (server) {
            this.rcsbServer = server;
        };


        Viewer.prototype.requestFullscreen = function () {

            var cont = $(this.contentDiv).attr('id');
            console.log(cont);

            var elem = document.getElementById(cont);

            console.log("element:" + elem);

            $(elem).css({
                'width': '100%',
                'height': '100%',
                'padding': '5%',
                'background': 'white'
            });

            if (elem.requestFullscreen) {
                elem.requestFullscreen();
            } else if (elem.msRequestFullscreen) {
                elem.msRequestFullscreen();
            } else if (elem.mozRequestFullScreen) {
                elem.mozRequestFullScreen();
            } else if (elem.webkitRequestFullscreen) {
                elem.webkitRequestFullscreen();
            } else {
                console.error("full screen does not seem to be supported on this system.");
            }

            this.updateScale();

            this.repaint();
        };


        return {
            PFV: function (elem, options) {

                return new Viewer(elem, options);
            }


        };
    });

