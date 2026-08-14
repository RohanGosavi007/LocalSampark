const { query, queryOne, queryMany } = require('../../../config/database');
const axios = require('axios');
const ExcelJS = require('exceljs');

class TallyIntegrationService {
    constructor() {
        this.tallyUrl = process.env.TALLY_URL || 'http://localhost:9000';
    }

    // Generate TDL XML for a Sales Invoice (Maintenance Bill)
    generateSalesInvoiceXML(invoiceData, ledgerMapping) {
        // Tally TDL XML schema for Sales Voucher
        return `
<ENVELOPE>
    <HEADER>
        <TALLYREQUEST>Import Data</TALLYREQUEST>
    </HEADER>
    <BODY>
        <IMPORTDATA>
            <REQUESTDESC>
                <REPORTNAME>Vouchers</REPORTNAME>
                <STATICVARIABLES>
                    <SVCURRENTCOMPANY>${invoiceData.societyName}</SVCURRENTCOMPANY>
                </STATICVARIABLES>
            </REQUESTDESC>
            <REQUESTDATA>
                <TALLYMESSAGE xmlns:UDF="TallyUDF">
                    <VOUCHER VCHTYPE="Sales" ACTION="Create">
                        <DATE>${invoiceData.date}</DATE>
                        <PARTYLEDGERNAME>Flat ${invoiceData.flatNumber}</PARTYLEDGERNAME>
                        <VOUCHERTYPENAME>Sales</VOUCHERTYPENAME>
                        <EFFECTIVEDATE>${invoiceData.date}</EFFECTIVEDATE>
                        ${invoiceData.items.map(item => `
                        <ALLLEDGERENTRIES.LIST>
                            <LEDGERNAME>${ledgerMapping[item.category] || item.category}</LEDGERNAME>
                            <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
                            <AMOUNT>${item.amount}</AMOUNT>
                        </ALLLEDGERENTRIES.LIST>
                        `).join('')}
                        <ALLLEDGERENTRIES.LIST>
                            <LEDGERNAME>Flat ${invoiceData.flatNumber}</LEDGERNAME>
                            <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
                            <AMOUNT>-${invoiceData.totalAmount}</AMOUNT>
                        </ALLLEDGERENTRIES.LIST>
                    </VOUCHER>
                </TALLYMESSAGE>
            </REQUESTDATA>
        </IMPORTDATA>
    </BODY>
</ENVELOPE>`;
    }

    // Push XML to Tally local server
    async pushToTally(xmlPayload) {
        try {
            const response = await axios.post(this.tallyUrl, xmlPayload, {
                headers: { 'Content-Type': 'text/xml' }
            });
            return { success: true, response: response.data };
        } catch (error) {
            console.error('Tally Sync Error:', error.message);
            return { success: false, error: error.message };
        }
    }

    // Generate CSV for manual Tally import
    async exportToCSV(societyId, dateRange) {
        const bills = await queryMany(`SELECT b.*, f.tenant_name, f.member_id 
             FROM society_maintenance_bills b
             JOIN society_flat_ledger f ON b.flat_number = f.flat_number AND b.society_id = f.society_id
             WHERE b.society_id = $1`, // add date range logic here
            [societyId]
        );

        let csvContent = 'Date,Voucher Type,Voucher No,Ledger Name,Amount,Dr/Cr,Narration\n';
        
        for (const bill of bills) {
            const date = new Date(bill.created_at).toLocaleDateString('en-GB');
            // Party debit
            csvContent += `${date},Sales,${bill.id},Flat ${bill.flat_number},${bill.total_amount},Dr,Monthly Maintenance Bill\n`;
            // Credits would need itemized breakdown for CSV, simplified here
            csvContent += `${date},Sales,${bill.id},Maintenance Account,${bill.total_amount},Cr,Monthly Maintenance Bill\n`;
        }

        return csvContent;
    }
}

module.exports = new TallyIntegrationService();
