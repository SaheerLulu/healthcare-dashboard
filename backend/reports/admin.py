from django.contrib import admin
from .models import (
    ReportSales, ReportSalesReturns, ReportPurchases,
    ReportInventory, ReportFinancial, ReportGST, ReportTDS,
)

admin.site.register(ReportSales)
admin.site.register(ReportSalesReturns)
admin.site.register(ReportPurchases)
admin.site.register(ReportInventory)
admin.site.register(ReportFinancial)
admin.site.register(ReportGST)
admin.site.register(ReportTDS)
