import { NextRequest, NextResponse } from "next/server";
import { obtenerDetalleColombiaLicita } from "@/lib/colombialicita";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { ok: false, error: "Falta el id del proceso" },
        { status: 400 }
      );
    }

    const data = await obtenerDetalleColombiaLicita(id);

    return NextResponse.json({
      ok: true,
      data,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 }
    );
  }
}