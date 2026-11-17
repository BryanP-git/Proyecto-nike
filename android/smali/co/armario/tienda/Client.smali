.class Lco/armario/tienda/Client;
.super Landroid/webkit/WebViewClient;
.source "MainActivity.java"

.field private final a:Lco/armario/tienda/MainActivity;

.method constructor <init>(Lco/armario/tienda/MainActivity;)V
    .registers 2
    invoke-direct {p0}, Landroid/webkit/WebViewClient;-><init>()V
    iput-object p1, p0, Lco/armario/tienda/Client;->a:Lco/armario/tienda/MainActivity;
    return-void
.end method

.method public shouldOverrideUrlLoading(Landroid/webkit/WebView;Ljava/lang/String;)Z
    .registers 4
    iget-object v0, p0, Lco/armario/tienda/Client;->a:Lco/armario/tienda/MainActivity;
    invoke-virtual {v0, p2}, Lco/armario/tienda/MainActivity;->handle(Ljava/lang/String;)Z
    move-result v0
    return v0
.end method

.method public onReceivedError(Landroid/webkit/WebView;ILjava/lang/String;Ljava/lang/String;)V
    .registers 7
    if-eqz p4, :end
    const-string v0, "file:"
    invoke-virtual {p4, v0}, Ljava/lang/String;->startsWith(Ljava/lang/String;)Z
    move-result v0
    if-nez v0, :end
    iget-object v0, p0, Lco/armario/tienda/Client;->a:Lco/armario/tienda/MainActivity;
    const/4 v1, 0x1
    invoke-virtual {v0, v1}, Lco/armario/tienda/MainActivity;->showSetup(Z)V
    :end
    return-void
.end method
