{ pkgs, ... }: {
  packages = [ pkgs.nodejs_22 pkgs.pnpm pkgs.quarto
    (pkgs.python3.withPackages (ps: [ ps.jupyter ps.ipykernel ])) ];
}
