.class public Lco/armario/tienda/MainActivity;
.super Landroid/app/Activity;
.source "MainActivity.java"

# Equivale a java/co/armario/tienda/MainActivity.java

.field public files:Landroid/webkit/ValueCallback;
.field public web:Landroid/webkit/WebView;

.method public constructor <init>()V
    .registers 1
    invoke-direct {p0}, Landroid/app/Activity;-><init>()V
    return-void
.end method

.method protected onCreate(Landroid/os/Bundle;)V
    .registers 6
    invoke-super {p0, p1}, Landroid/app/Activity;->onCreate(Landroid/os/Bundle;)V

    invoke-virtual {p0}, Lco/armario/tienda/MainActivity;->getWindow()Landroid/view/Window;
    move-result-object v0
    const v1, -0xf5f8f0
    invoke-virtual {v0, v1}, Landroid/view/Window;->setStatusBarColor(I)V
    const v1, -0xf8faf5
    invoke-virtual {v0, v1}, Landroid/view/Window;->setNavigationBarColor(I)V

    new-instance v0, Landroid/webkit/WebView;
    invoke-direct {v0, p0}, Landroid/webkit/WebView;-><init>(Landroid/content/Context;)V
    iput-object v0, p0, Lco/armario/tienda/MainActivity;->web:Landroid/webkit/WebView;
    invoke-virtual {v0, v1}, Landroid/webkit/WebView;->setBackgroundColor(I)V

    invoke-virtual {v0}, Landroid/webkit/WebView;->getSettings()Landroid/webkit/WebSettings;
    move-result-object v1
    const/4 v2, 0x1
    invoke-virtual {v1, v2}, Landroid/webkit/WebSettings;->setJavaScriptEnabled(Z)V
    invoke-virtual {v1, v2}, Landroid/webkit/WebSettings;->setDomStorageEnabled(Z)V
    invoke-virtual {v1}, Landroid/webkit/WebSettings;->getUserAgentString()Ljava/lang/String;
    move-result-object v2
    const-string v3, " ArmarioApp/1.0"
    invoke-virtual {v2, v3}, Ljava/lang/String;->concat(Ljava/lang/String;)Ljava/lang/String;
    move-result-object v2
    invoke-virtual {v1, v2}, Landroid/webkit/WebSettings;->setUserAgentString(Ljava/lang/String;)V

    new-instance v1, Lco/armario/tienda/Client;
    invoke-direct {v1, p0}, Lco/armario/tienda/Client;-><init>(Lco/armario/tienda/MainActivity;)V
    invoke-virtual {v0, v1}, Landroid/webkit/WebView;->setWebViewClient(Landroid/webkit/WebViewClient;)V
    new-instance v1, Lco/armario/tienda/Chrome;
    invoke-direct {v1, p0}, Lco/armario/tienda/Chrome;-><init>(Lco/armario/tienda/MainActivity;)V
    invoke-virtual {v0, v1}, Landroid/webkit/WebView;->setWebChromeClient(Landroid/webkit/WebChromeClient;)V
    invoke-virtual {p0, v0}, Lco/armario/tienda/MainActivity;->setContentView(Landroid/view/View;)V

    invoke-direct {p0}, Lco/armario/tienda/MainActivity;->saved()Ljava/lang/String;
    move-result-object v1
    if-nez v1, :load
    const-string v1, "file:///android_asset/setup.html"
    :load
    invoke-virtual {v0, v1}, Landroid/webkit/WebView;->loadUrl(Ljava/lang/String;)V
    return-void
.end method

.method private saved()Ljava/lang/String;
    .registers 4
    const-string v0, "armario"
    const/4 v1, 0x0
    invoke-virtual {p0, v0, v1}, Lco/armario/tienda/MainActivity;->getSharedPreferences(Ljava/lang/String;I)Landroid/content/SharedPreferences;
    move-result-object v0
    const-string v1, "url"
    const/4 v2, 0x0
    invoke-interface {v0, v1, v2}, Landroid/content/SharedPreferences;->getString(Ljava/lang/String;Ljava/lang/String;)Ljava/lang/String;
    move-result-object v0
    return-object v0
.end method

.method public showSetup(Z)V
    .registers 6
    invoke-direct {p0}, Lco/armario/tienda/MainActivity;->saved()Ljava/lang/String;
    move-result-object v0
    if-nez v0, :has
    const-string v0, ""
    :has
    invoke-static {v0}, Landroid/net/Uri;->encode(Ljava/lang/String;)Ljava/lang/String;
    move-result-object v0
    if-eqz p1, :noerr
    const-string v1, "file:///android_asset/setup.html#e=1&u="
    goto :go
    :noerr
    const-string v1, "file:///android_asset/setup.html#u="
    :go
    invoke-virtual {v1, v0}, Ljava/lang/String;->concat(Ljava/lang/String;)Ljava/lang/String;
    move-result-object v1
    iget-object v2, p0, Lco/armario/tienda/MainActivity;->web:Landroid/webkit/WebView;
    invoke-virtual {v2, v1}, Landroid/webkit/WebView;->loadUrl(Ljava/lang/String;)V
    return-void
.end method

.method public handle(Ljava/lang/String;)Z
    .registers 7

    # enlaces http(s): mismo servidor -> dentro de la app; otro dominio -> navegador
    const-string v0, "http"
    invoke-virtual {p1, v0}, Ljava/lang/String;->startsWith(Ljava/lang/String;)Z
    move-result v0
    if-eqz v0, :notweb
    invoke-direct {p0}, Lco/armario/tienda/MainActivity;->saved()Ljava/lang/String;
    move-result-object v0
    if-eqz v0, :inapp
    invoke-static {v0}, Landroid/net/Uri;->parse(Ljava/lang/String;)Landroid/net/Uri;
    move-result-object v0
    invoke-virtual {v0}, Landroid/net/Uri;->getHost()Ljava/lang/String;
    move-result-object v0
    invoke-static {p1}, Landroid/net/Uri;->parse(Ljava/lang/String;)Landroid/net/Uri;
    move-result-object v1
    invoke-virtual {v1}, Landroid/net/Uri;->getHost()Ljava/lang/String;
    move-result-object v2
    invoke-virtual {v0, v2}, Ljava/lang/String;->equals(Ljava/lang/Object;)Z
    move-result v0
    if-nez v0, :inapp
    new-instance v0, Landroid/content/Intent;
    const-string v2, "android.intent.action.VIEW"
    invoke-direct {v0, v2, v1}, Landroid/content/Intent;-><init>(Ljava/lang/String;Landroid/net/Uri;)V
    :try_start
    invoke-virtual {p0, v0}, Lco/armario/tienda/MainActivity;->startActivity(Landroid/content/Intent;)V
    :try_end
    .catch Ljava/lang/Exception; {:try_start .. :try_end} :external
    :external
    const/4 v0, 0x1
    return v0
    :inapp
    const/4 v0, 0x0
    return v0

    :notweb
    const-string v0, "armario:"
    invoke-virtual {p1, v0}, Ljava/lang/String;->startsWith(Ljava/lang/String;)Z
    move-result v0
    if-nez v0, :ours
    const/4 v0, 0x0
    return v0

    :ours
    invoke-static {p1}, Landroid/net/Uri;->parse(Ljava/lang/String;)Landroid/net/Uri;
    move-result-object v0
    invoke-virtual {v0}, Landroid/net/Uri;->getHost()Ljava/lang/String;
    move-result-object v1
    iget-object v2, p0, Lco/armario/tienda/MainActivity;->web:Landroid/webkit/WebView;

    const-string v3, "save"
    invoke-virtual {v3, v1}, Ljava/lang/String;->equals(Ljava/lang/Object;)Z
    move-result v3
    if-eqz v3, :notsave
    const-string v3, "url"
    invoke-virtual {v0, v3}, Landroid/net/Uri;->getQueryParameter(Ljava/lang/String;)Ljava/lang/String;
    move-result-object v3
    if-eqz v3, :done
    const-string v1, "armario"
    const/4 v4, 0x0
    invoke-virtual {p0, v1, v4}, Lco/armario/tienda/MainActivity;->getSharedPreferences(Ljava/lang/String;I)Landroid/content/SharedPreferences;
    move-result-object v1
    invoke-interface {v1}, Landroid/content/SharedPreferences;->edit()Landroid/content/SharedPreferences$Editor;
    move-result-object v1
    const-string v4, "url"
    invoke-interface {v1, v4, v3}, Landroid/content/SharedPreferences$Editor;->putString(Ljava/lang/String;Ljava/lang/String;)Landroid/content/SharedPreferences$Editor;
    move-result-object v1
    invoke-interface {v1}, Landroid/content/SharedPreferences$Editor;->apply()V
    invoke-virtual {v2, v3}, Landroid/webkit/WebView;->loadUrl(Ljava/lang/String;)V
    goto :done

    :notsave
    const-string v3, "setup"
    invoke-virtual {v3, v1}, Ljava/lang/String;->equals(Ljava/lang/Object;)Z
    move-result v3
    if-eqz v3, :notsetup
    const/4 v3, 0x0
    invoke-virtual {p0, v3}, Lco/armario/tienda/MainActivity;->showSetup(Z)V
    goto :done

    :notsetup
    const-string v3, "print"
    invoke-virtual {v3, v1}, Ljava/lang/String;->equals(Ljava/lang/Object;)Z
    move-result v3
    if-eqz v3, :done
    const-string v3, "print"
    invoke-virtual {p0, v3}, Lco/armario/tienda/MainActivity;->getSystemService(Ljava/lang/String;)Ljava/lang/Object;
    move-result-object v3
    check-cast v3, Landroid/print/PrintManager;
    const-string v1, "Factura Armario"
    invoke-virtual {v2, v1}, Landroid/webkit/WebView;->createPrintDocumentAdapter(Ljava/lang/String;)Landroid/print/PrintDocumentAdapter;
    move-result-object v4
    const/4 v0, 0x0
    invoke-virtual {v3, v1, v4, v0}, Landroid/print/PrintManager;->print(Ljava/lang/String;Landroid/print/PrintDocumentAdapter;Landroid/print/PrintAttributes;)Landroid/print/PrintJob;

    :done
    const/4 v0, 0x1
    return v0
.end method

.method public choose(Landroid/webkit/ValueCallback;Landroid/webkit/WebChromeClient$FileChooserParams;)Z
    .registers 6
    iget-object v0, p0, Lco/armario/tienda/MainActivity;->files:Landroid/webkit/ValueCallback;
    if-eqz v0, :fresh
    const/4 v1, 0x0
    invoke-interface {v0, v1}, Landroid/webkit/ValueCallback;->onReceiveValue(Ljava/lang/Object;)V
    :fresh
    iput-object p1, p0, Lco/armario/tienda/MainActivity;->files:Landroid/webkit/ValueCallback;
    :try_start
    invoke-virtual {p2}, Landroid/webkit/WebChromeClient$FileChooserParams;->createIntent()Landroid/content/Intent;
    move-result-object v0
    const/4 v1, 0x7
    invoke-virtual {p0, v0, v1}, Lco/armario/tienda/MainActivity;->startActivityForResult(Landroid/content/Intent;I)V
    :try_end
    .catch Ljava/lang/Exception; {:try_start .. :try_end} :fail
    const/4 v0, 0x1
    return v0
    :fail
    const/4 v0, 0x0
    iput-object v0, p0, Lco/armario/tienda/MainActivity;->files:Landroid/webkit/ValueCallback;
    const/4 v0, 0x0
    return v0
.end method

.method protected onActivityResult(IILandroid/content/Intent;)V
    .registers 6
    invoke-super {p0, p1, p2, p3}, Landroid/app/Activity;->onActivityResult(IILandroid/content/Intent;)V
    const/4 v0, 0x7
    if-ne p1, v0, :end
    iget-object v0, p0, Lco/armario/tienda/MainActivity;->files:Landroid/webkit/ValueCallback;
    if-eqz v0, :end
    invoke-static {p2, p3}, Landroid/webkit/WebChromeClient$FileChooserParams;->parseResult(ILandroid/content/Intent;)[Landroid/net/Uri;
    move-result-object v1
    invoke-interface {v0, v1}, Landroid/webkit/ValueCallback;->onReceiveValue(Ljava/lang/Object;)V
    const/4 v0, 0x0
    iput-object v0, p0, Lco/armario/tienda/MainActivity;->files:Landroid/webkit/ValueCallback;
    :end
    return-void
.end method

.method public onBackPressed()V
    .registers 2
    iget-object v0, p0, Lco/armario/tienda/MainActivity;->web:Landroid/webkit/WebView;
    invoke-virtual {v0}, Landroid/webkit/WebView;->canGoBack()Z
    move-result v0
    if-eqz v0, :exit
    iget-object v0, p0, Lco/armario/tienda/MainActivity;->web:Landroid/webkit/WebView;
    invoke-virtual {v0}, Landroid/webkit/WebView;->goBack()V
    return-void
    :exit
    invoke-super {p0}, Landroid/app/Activity;->onBackPressed()V
    return-void
.end method

.method protected onPause()V
    .registers 2
    invoke-super {p0}, Landroid/app/Activity;->onPause()V
    iget-object v0, p0, Lco/armario/tienda/MainActivity;->web:Landroid/webkit/WebView;
    invoke-virtual {v0}, Landroid/webkit/WebView;->onPause()V
    return-void
.end method

.method protected onResume()V
    .registers 2
    invoke-super {p0}, Landroid/app/Activity;->onResume()V
    iget-object v0, p0, Lco/armario/tienda/MainActivity;->web:Landroid/webkit/WebView;
    invoke-virtual {v0}, Landroid/webkit/WebView;->onResume()V
    return-void
.end method
