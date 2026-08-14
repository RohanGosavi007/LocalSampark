const PDFDocument = require('pdfkit');
const { queryOne } = require('../../../config/database');

const generateNOC = async (req, res, next) => {
    try {
        const member = await queryOne(`SELECT sm.*, s.name as society_name, u.full_name 
             FROM society_members sm 
             JOIN societies s ON sm.society_id = s.id 
             JOIN users u ON sm.user_id = u.id 
             WHERE sm.user_id = $1 AND sm.is_active = 1`,
            [req.user.id]
        );

        if (!member) return res.status(404).json({ error: 'Society member not found' });

        const doc = new PDFDocument();
        res.setHeader('Content-disposition', `attachment; filename=NOC_${member.flat_number}.pdf`);
        res.setHeader('Content-type', 'application/pdf');

        doc.pipe(res);

        doc.fontSize(20).text(`${member.society_name}`, { align: 'center' });
        doc.moveDown();
        doc.fontSize(16).text('NO OBJECTION CERTIFICATE (NOC)', { align: 'center', underline: true });
        doc.moveDown(2);

        doc.fontSize(12).text(`Date: ${new Date().toLocaleDateString()}`, { align: 'right' });
        doc.moveDown();
        
        doc.text(`TO WHOMSOEVER IT MAY CONCERN`, { align: 'left', underline: true });
        doc.moveDown();

        const content = `This is to certify that ${member.full_name} is a bona fide resident of Flat No. ${member.flat_number} in ${member.society_name}.\n\nThe society has no objection to them applying for passport/domicile or using this address as proof of residence.\n\nAll maintenance dues are cleared up to date.`;
        
        doc.text(content, { align: 'justify', lineGap: 5 });
        
        doc.moveDown(5);
        doc.text('Authorized Signatory', { align: 'right' });
        doc.text('(Secretary / Chairman)', { align: 'right' });

        doc.end();
    } catch (error) { next(error); }
};

module.exports = {
    generateNOC
};
