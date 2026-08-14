import { MatPaginatorIntl } from "@angular/material/paginator";

export function customMatPaginatorIntl(): MatPaginatorIntl {
    const paginatorIntl = new MatPaginatorIntl();
    paginatorIntl.itemsPerPageLabel = 'Items por página:';
    paginatorIntl.nextPageLabel = 'Página siguiente';
    paginatorIntl.previousPageLabel = 'Página anterior';
    paginatorIntl.firstPageLabel = 'Primera página';
    paginatorIntl.lastPageLabel = 'Última página';
    return paginatorIntl;
};


