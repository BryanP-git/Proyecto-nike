.class Lco/armario/tienda/Chrome;
.super Landroid/webkit/WebChromeClient;
.source "MainActivity.java"

.field private final a:Lco/armario/tienda/MainActivity;

.method constructor <init>(Lco/armario/tienda/MainActivity;)V
    .registers 2
    invoke-direct {p0}, Landroid/webkit/WebChromeClient;-><init>()V
    iput-object p1, p0, Lco/armario/tienda/Chrome;->a:Lco/armario/tienda/MainActivity;
    return-void
.end method

.method public onShowFileChooser(Landroid/webkit/WebView;Landroid/webkit/ValueCallback;Landroid/webkit/WebChromeClient$FileChooserParams;)Z
    .registers 5
    iget-object v0, p0, Lco/armario/tienda/Chrome;->a:Lco/armario/tienda/MainActivity;
    invoke-virtual {v0, p2, p3}, Lco/armario/tienda/MainActivity;->choose(Landroid/webkit/ValueCallback;Landroid/webkit/WebChromeClient$FileChooserParams;)Z
    move-result v0
    return v0
.end method
