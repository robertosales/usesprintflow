// Dentro do KpiCard — troque o CardContent por este:
<CardContent className="p-4 pb-3">
  <div className="flex items-start justify-between mb-3">
    <p className="text-[11px] text-muted-foreground font-medium tracking-wide uppercase leading-none">{label}</p>
    <div className={cn("rounded-lg p-1.5 transition-colors", alert ? "bg-destructive/10" : "bg-muted/50")}>
      <Icon className={cn("h-3.5 w-3.5", alert ? "text-destructive" : (iconClass ?? "text-muted-foreground"))} />
    </div>
  </div>
  <p className={cn("text-[26px] font-bold tracking-tight tabular-nums leading-none mb-1", alert && "text-destructive")}>
    {value}
  </p>
  {sub && <p className="text-[11px] text-muted-foreground mt-1.5 leading-none">{sub}</p>}
  {progress !== undefined && (
    <div className="mt-3 space-y-1">
      <Progress value={progress} className="h-1.5 rounded-full" />
      <p className="text-[10px] text-muted-foreground text-right tabular-nums">{progress}%</p>
    </div>
  )}
</CardContent>;
