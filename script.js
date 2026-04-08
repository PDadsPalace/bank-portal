function showForm(formId) {
    document.querySelectorAll('.portal-nav button').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`btn-${formId}`).classList.add('active');
    
    document.getElementById('deposit-form').style.display = formId === 'deposit' ? 'block' : 'none';
    document.getElementById('check-form').style.display = formId === 'check' ? 'block' : 'none';
    document.getElementById('history-form').style.display = formId === 'history' ? 'block' : 'none';

    if (formId === 'history') loadHistory();
}

function formatDate(dateString) {
    if (!dateString) return '';
    const parts = dateString.split('-');
    return `${parts[1]}/${parts[2]}/${parts[0]}`;
}

function printDepositSlip() {
    const rawDate = document.getElementById('dep-date').value;
    const account = document.getElementById('dep-account').value;
    const bills = parseFloat(document.getElementById('dep-bills').value) || 0;
    const coins = parseFloat(document.getElementById('dep-coins').value) || 0;
    const count = document.getElementById('dep-chk-count').value;
    const chkAmt = parseFloat(document.getElementById('dep-chk-amt').value) || 0;
    const total = bills + coins + chkAmt;

    // Fill Overlay 1
    document.getElementById('ov-dep-date').textContent = formatDate(rawDate);
    document.getElementById('ov-dep-account').textContent = account;
    
    const fmt = (n) => n > 0 ? n.toFixed(2) : '';
    document.getElementById('ov-dep-bills').textContent = fmt(bills);
    document.getElementById('ov-dep-coins').textContent = fmt(coins);
    document.getElementById('ov-dep-chk-count').textContent = count;
    document.getElementById('ov-dep-chk-amt').textContent = fmt(chkAmt);
    document.getElementById('ov-dep-total').textContent = total > 0 ? total.toFixed(2) : '';

    // Fill Overlay 2 (Breakdown Page)
    let bHtml = "";
    document.querySelectorAll('.source-item').forEach((el) => {
        const desc = el.querySelector('.src-desc').value;
        const amt = el.querySelector('.src-amt').value;
        if(desc || amt) {
            bHtml += `<div class="br-row"><span>${desc}</span><span>$${parseFloat(amt || 0).toFixed(2)}</span></div>`;
        }
    });
    document.getElementById('ov-breakdown-items').innerHTML = bHtml;
    document.getElementById('ov-breakdown-final-total').innerText = "Total: $" + total.toFixed(2);

    saveToHistory('Deposit');

    document.getElementById('print-chk-overlay').style.display = 'none';
    document.getElementById('print-dep-overlay').style.display = 'block';
    document.getElementById('print-breakdown-overlay').style.display = 'block';
    
    window.print();
    window.onafterprint = () => { document.querySelectorAll('.print-overlay-container').forEach(el => el.style.display = ''); }
}

function printCheckRequest() {
    const rawDate = document.getElementById('chk-date').value;
    const payee = document.getElementById('chk-payee').value;
    const amount = parseFloat(document.getElementById('chk-amount').value) || 0;
    const account = document.getElementById('chk-account').value;
    const reason = document.getElementById('chk-reason').value;

    document.getElementById('ov-chk-date').textContent = formatDate(rawDate);
    document.getElementById('ov-chk-payee').textContent = payee;
    document.getElementById('ov-chk-amount').textContent = amount > 0 ? '$' + amount.toFixed(2) : '';
    document.getElementById('ov-chk-account').textContent = account;
    document.getElementById('ov-chk-reason').innerText = reason;

    saveToHistory('Check Request');

    document.getElementById('print-dep-overlay').style.display = 'none';
    document.getElementById('print-breakdown-overlay').style.display = 'none';
    document.getElementById('print-chk-overlay').style.display = 'block';
    
    window.print();
    window.onafterprint = () => { document.querySelectorAll('.print-overlay-container').forEach(el => el.style.display = ''); }
}

function validateTotals() {
    const bills = parseFloat(document.getElementById('dep-bills').value) || 0;
    const coins = parseFloat(document.getElementById('dep-coins').value) || 0;
    const chkAmt = parseFloat(document.getElementById('dep-chk-amt').value) || 0;
    const mainTotal = bills + coins + chkAmt;

    let breakdownSum = 0;
    document.querySelectorAll('.src-amt').forEach(input => breakdownSum += parseFloat(input.value) || 0);

    const status = document.getElementById('match-status');
    const isMatch = mainTotal.toFixed(2) === breakdownSum.toFixed(2);
    status.innerText = `Breakdown: $${breakdownSum.toFixed(2)} ${isMatch ? '(✓ Matches)' : '(✗ No Match)'}`;
    status.style.color = isMatch ? "green" : "red";
}

function addSourceRow(descVal = '', amtVal = '') {
    const div = document.createElement('div');
    div.className = 'source-item';
    div.innerHTML = `
        <input type="text" placeholder="Description" class="src-desc" style="flex: 2;" value="${descVal}">
        <input type="number" placeholder="Amount" class="src-amt" step="0.01" oninput="validateTotals()" style="flex: 1;" value="${amtVal}">
    `;
    document.getElementById('source-rows').appendChild(div);
}

function handleCSVUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const text = e.target.result;
        const rows = text.split('\n').map(r => r.trim()).filter(r => r);
        
        // Assume first row is header
        const dataRows = rows.slice(1);

        // Clear existing rows
        document.getElementById('source-rows').innerHTML = '';

        dataRows.forEach(row => {
            const cols = [];
            let current = '';
            let inQuotes = false;
            for (let i = 0; i < row.length; i++) {
                if (row[i] === '"') {
                    inQuotes = !inQuotes;
                } else if (row[i] === ',' && !inQuotes) {
                    cols.push(current);
                    current = '';
                } else {
                    current += row[i];
                }
            }
            cols.push(current);

            const name = (cols[0] || '').replace(/^"|"$/g, '').trim();
            const method = (cols[1] || '').replace(/^"|"$/g, '').trim();
            const checkNum = (cols[2] || '').replace(/^"|"$/g, '').trim();
            const amountStr = (cols[3] || '').replace(/^"|"$/g, '').replace('$', '').trim();
            const amount = parseFloat(amountStr) || 0;

            let desc = name;
            if (method && method.toLowerCase() !== 'none') desc += ` (${method})`;
            if (checkNum) desc += ` - Chk#${checkNum}`;

            // Add the row using the existing function
            addSourceRow(desc, amount.toFixed(2));
        });

        // Validate overall totals to see if breakdown matches entered cash/check
        validateTotals();
        event.target.value = ""; // prompt allows same file re-upload
    };
    reader.readAsText(file);
}

// ==========================================
// UPDATED HISTORY FUNCTIONS
// ==========================================

function saveToHistory(type) {
    const history = JSON.parse(localStorage.getItem('hhw_history') || '[]');
    let entry = { id: Date.now(), dateStr: new Date().toLocaleDateString(), type: type };

    if (type === 'Deposit') {
        entry.rawDate = document.getElementById('dep-date').value;
        entry.account = document.getElementById('dep-account').value;
        entry.bills = document.getElementById('dep-bills').value;
        entry.coins = document.getElementById('dep-coins').value;
        entry.chkCount = document.getElementById('dep-chk-count').value;
        entry.chkAmt = document.getElementById('dep-chk-amt').value;
        
        entry.breakdown = [];
        document.querySelectorAll('.source-item').forEach(item => {
            const desc = item.querySelector('.src-desc').value;
            const amt = item.querySelector('.src-amt').value;
            if (desc || amt) entry.breakdown.push({ desc, amt });
        });

        const total = (parseFloat(entry.bills)||0) + (parseFloat(entry.coins)||0) + (parseFloat(entry.chkAmt)||0);
        entry.displayTotal = total.toFixed(2);
        entry.displayDesc = entry.account;
        
        if (total <= 0) return; // don't save empty
    } else {
        entry.rawDate = document.getElementById('chk-date').value;
        entry.payee = document.getElementById('chk-payee').value;
        entry.amount = document.getElementById('chk-amount').value;
        entry.account = document.getElementById('chk-account').value;
        entry.reason = document.getElementById('chk-reason').value;
        entry.displayTotal = parseFloat(entry.amount || 0).toFixed(2);
        entry.displayDesc = entry.payee;

        if (entry.displayTotal <= 0) return;
    }

    history.push(entry);
    localStorage.setItem('hhw_history', JSON.stringify(history));
}

function loadHistory() {
    const history = JSON.parse(localStorage.getItem('hhw_history') || '[]');
    const list = document.getElementById('history-list');
    
    // Reverse the array to show newest first, but we need to pass the real index to the click handler
    list.innerHTML = history.map((item, index) => `
        <div class="history-card" onclick="repopulateForm(${index})" title="Click to view/reprint">
            <span><strong>${item.dateStr}</strong><br><span style="color:#666; font-size:12px;">${item.type}</span></span>
            <span>${item.displayDesc}</span>
            <span style="font-weight:bold">$${item.displayTotal}</span>
        </div>`).reverse().join('');
}

function repopulateForm(index) {
    const history = JSON.parse(localStorage.getItem('hhw_history') || '[]');
    const item = history[index];
    if (!item) return;

    if (item.type === 'Deposit') {
        document.getElementById('dep-date').value = item.rawDate || '';
        document.getElementById('dep-account').value = item.account || '';
        document.getElementById('dep-bills').value = item.bills || '';
        document.getElementById('dep-coins').value = item.coins || '';
        document.getElementById('dep-chk-count').value = item.chkCount || '';
        document.getElementById('dep-chk-amt').value = item.chkAmt || '';

        // Clear existing breakdown rows and recreate them
        document.getElementById('source-rows').innerHTML = '';
        if (item.breakdown && item.breakdown.length > 0) {
            item.breakdown.forEach(b => addSourceRow(b.desc, b.amt));
        } else {
            addSourceRow(); // add one empty row if none existed
        }
        
        validateTotals();
        showForm('deposit');
    } else {
        document.getElementById('chk-date').value = item.rawDate || '';
        document.getElementById('chk-payee').value = item.payee || '';
        document.getElementById('chk-amount').value = item.amount || '';
        document.getElementById('chk-account').value = item.account || '';
        document.getElementById('chk-reason').value = item.reason || '';
        
        showForm('check');
    }
}

function filterHistory() {
    const q = document.getElementById('history-search').value.toLowerCase();
    document.querySelectorAll('.history-card').forEach(card => {
        card.style.display = card.innerText.toLowerCase().includes(q) ? 'flex' : 'none';
    });
}

function clearHistory() {
    if(confirm("Are you sure you want to delete all local history logs?")) {
        localStorage.removeItem('hhw_history');
        loadHistory();
    }
}